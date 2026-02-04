import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken, encryptToken, isEncrypted } from "../_shared/crypto.ts";

const EXACT_API_URL = "https://start.exactonline.nl";
const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

interface AbitareOrder {
  id: string;
  order_number: number;
  order_date: string | null;
  customer_id: string;
  total_excl_vat: number | null;
  total_vat: number | null;
  total_incl_vat: number | null;
  payment_status: string | null;
  amount_paid: number | null;
  exact_invoice_id: string | null;
  exact_sales_order_id: string | null;
  division_id: string | null;
  customer?: {
    exact_account_id: string | null;
    last_name: string;
    company_name: string | null;
  };
  order_lines?: AbitareOrderLine[];
}

interface AbitareOrderLine {
  id: string;
  description: string;
  quantity: number | null;
  unit_price: number;
  vat_rate: number | null;
  line_total: number | null;
  article_code: string | null;
}

interface ExactSalesInvoiceLine {
  AmountDC: number;
  Description: string;
  Quantity: number;
  UnitPrice: number;
  VATPercentage?: number;
  Item?: string;
}

interface ExactSalesInvoice {
  InvoiceTo: string; // Account GUID
  OrderedBy: string; // Account GUID
  InvoiceDate?: string;
  PaymentCondition?: string;
  Description?: string;
  YourRef?: string;
  SalesInvoiceLines?: ExactSalesInvoiceLine[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, divisionId, orderId } = await req.json();

    if (!divisionId) {
      throw new Error("divisionId is required");
    }

    // Get connection for this division
    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("*")
      .eq("division_id", divisionId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("No active Exact Online connection found for this division");
    }

    // Get valid access token
    const accessToken = await getValidToken(supabase, connection);
    const exactDivision = connection.exact_division;

    if (action === "push") {
      // Push order(s) as sales invoice to Exact
      return await pushInvoices(supabase, accessToken, exactDivision, divisionId, orderId);
    } else if (action === "pull_status") {
      // Pull payment status from Exact
      return await pullPaymentStatus(supabase, accessToken, exactDivision, divisionId, orderId);
    } else if (action === "sync") {
      // Full sync: push new invoices and pull payment status
      const pushResult = await pushInvoicesInternal(supabase, accessToken, exactDivision, divisionId, orderId);
      const pullResult = await pullPaymentStatusInternal(supabase, accessToken, exactDivision, divisionId);
      
      return new Response(JSON.stringify({
        success: true,
        pushed: pushResult,
        pulled: pullResult,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid action. Use 'push', 'pull_status', or 'sync'");
    }
  } catch (error: unknown) {
    console.error("Invoice sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function pushInvoices(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  orderId?: string
): Promise<Response> {
  const result = await pushInvoicesInternal(supabase, accessToken, exactDivision, divisionId, orderId);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pushInvoicesInternal(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  orderId?: string
) {
  // Get orders that need to be pushed (no exact_invoice_id yet)
  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      order_date,
      customer_id,
      total_excl_vat,
      total_vat,
      total_incl_vat,
      payment_status,
      amount_paid,
      exact_invoice_id,
      exact_sales_order_id,
      division_id,
      customers!inner(exact_account_id, last_name, company_name),
      order_lines(id, description, quantity, unit_price, vat_rate, line_total, article_code)
    `)
    .eq("division_id", divisionId);

  if (orderId) {
    query = query.eq("id", orderId);
  } else {
    // Only orders without Exact invoice ID
    query = query.is("exact_invoice_id", null);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  const results = {
    success: true,
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const order of orders as AbitareOrder[]) {
    try {
      // Skip if already has invoice ID
      if (order.exact_invoice_id && !orderId) {
        results.skipped++;
        continue;
      }

      const customer = order.customer || (order as any).customers;
      
      // Check if customer is linked to Exact
      if (!customer?.exact_account_id) {
        results.skipped++;
        results.errors.push(`Order #${order.order_number}: Klant niet gekoppeld aan Exact Online`);
        continue;
      }

      // Build invoice
      const exactInvoice = mapToExactInvoice(order, customer.exact_account_id);

      // Create sales invoice in Exact
      const response = await fetch(
        `${EXACT_API_URL}/api/v1/${exactDivision}/salesinvoice/SalesInvoices`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(exactInvoice),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to create invoice for order ${order.order_number}:`, errorText);
        results.failed++;
        results.errors.push(`Order #${order.order_number}: ${errorText}`);
      } else {
        const data = await response.json();
        const invoiceId = data.d?.InvoiceID;
        const invoiceNumber = data.d?.InvoiceNumber;

        if (invoiceId) {
          // Update order with Exact Invoice ID
          await supabase
            .from("orders")
            .update({ 
              exact_invoice_id: invoiceNumber?.toString() || invoiceId,
            })
            .eq("id", order.id);
        }
        results.created++;
      }
    } catch (err) {
      console.error(`Error creating invoice for order ${order.id}:`, err);
      results.failed++;
      results.errors.push(`Order #${order.order_number}: ${String(err)}`);
    }
  }

  return results;
}

async function pullPaymentStatus(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  orderId?: string
): Promise<Response> {
  const result = await pullPaymentStatusInternal(supabase, accessToken, exactDivision, divisionId, orderId);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pullPaymentStatusInternal(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  orderId?: string
) {
  const results = {
    success: true,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Get orders with Exact invoice IDs
  let query = supabase
    .from("orders")
    .select("id, order_number, exact_invoice_id, total_incl_vat, amount_paid, payment_status")
    .eq("division_id", divisionId)
    .not("exact_invoice_id", "is", null);

  if (orderId) {
    query = query.eq("id", orderId);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  for (const order of orders) {
    try {
      // Fetch invoice status from Exact
      // Try to find by invoice number
      const filterValue = order.exact_invoice_id;
      const url = `${EXACT_API_URL}/api/v1/${exactDivision}/salesinvoice/SalesInvoices?$filter=InvoiceNumber eq ${filterValue}&$select=InvoiceID,InvoiceNumber,AmountDC,Status,PaymentReference`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        results.skipped++;
        continue;
      }

      const data = await response.json();
      const invoices = data.d?.results || [];

      if (invoices.length === 0) {
        results.skipped++;
        continue;
      }

      const exactInvoice = invoices[0];
      
      // Get outstanding amount from receivables
      const receivablesUrl = `${EXACT_API_URL}/api/v1/${exactDivision}/read/financial/Receivables?$filter=InvoiceNumber eq ${filterValue}&$select=AmountDC,OriginalAmountDC`;
      
      const receivablesResponse = await fetch(receivablesUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      let amountPaid = 0;
      let paymentStatus: "open" | "deels_betaald" | "betaald" = "open";

      if (receivablesResponse.ok) {
        const receivablesData = await receivablesResponse.json();
        const receivables = receivablesData.d?.results || [];
        
        if (receivables.length > 0) {
          const originalAmount = receivables[0].OriginalAmountDC || 0;
          const outstandingAmount = receivables[0].AmountDC || 0;
          amountPaid = originalAmount - outstandingAmount;
          
          if (outstandingAmount <= 0) {
            paymentStatus = "betaald";
          } else if (amountPaid > 0) {
            paymentStatus = "deels_betaald";
          }
        }
      } else {
        // Fallback: check invoice status
        // Status 50 = Paid in Exact
        if (exactInvoice.Status === 50) {
          paymentStatus = "betaald";
          amountPaid = order.total_incl_vat || 0;
        }
      }

      // Update order if status changed
      if (paymentStatus !== order.payment_status || amountPaid !== order.amount_paid) {
        await supabase
          .from("orders")
          .update({
            payment_status: paymentStatus,
            amount_paid: amountPaid,
          })
          .eq("id", order.id);
        results.updated++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      console.error(`Error pulling status for order ${order.id}:`, err);
      results.errors.push(`Order #${order.order_number}: ${String(err)}`);
    }
  }

  return results;
}

function mapToExactInvoice(order: AbitareOrder, accountId: string): ExactSalesInvoice {
  const lines: ExactSalesInvoiceLine[] = [];
  
  const orderLines = order.order_lines || (order as any).order_lines || [];
  
  for (const line of orderLines) {
    // Skip group headers
    if ((line as any).is_group_header) continue;
    
    lines.push({
      Description: line.description,
      Quantity: line.quantity || 1,
      UnitPrice: line.unit_price,
      AmountDC: line.line_total || (line.unit_price * (line.quantity || 1)),
      VATPercentage: (line.vat_rate || 21) / 100, // Exact expects decimal (0.21)
    });
  }

  // If no lines, create a single line with total
  if (lines.length === 0) {
    lines.push({
      Description: `Order #${order.order_number}`,
      Quantity: 1,
      UnitPrice: order.total_excl_vat || 0,
      AmountDC: order.total_excl_vat || 0,
      VATPercentage: 0.21,
    });
  }

  return {
    InvoiceTo: accountId,
    OrderedBy: accountId,
    InvoiceDate: order.order_date || new Date().toISOString().split("T")[0],
    Description: `Factuur order #${order.order_number}`,
    YourRef: `ORD-${order.order_number}`,
    SalesInvoiceLines: lines,
  };
}

// deno-lint-ignore no-explicit-any
async function getValidToken(supabase: any, connection: any) {
  // Decrypt stored tokens
  let accessToken = connection.access_token;
  let refreshToken = connection.refresh_token;
  
  if (isEncrypted(accessToken)) {
    accessToken = await decryptToken(accessToken);
  }
  if (isEncrypted(refreshToken)) {
    refreshToken = await decryptToken(refreshToken);
  }

  const tokenExpiry = new Date(connection.token_expires_at);

  if (new Date() >= tokenExpiry) {
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Missing Exact Online credentials");
    }

    const response = await fetch(EXACT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt new tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

    await supabase
      .from("exact_online_connections")
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  }

  return accessToken;
}
