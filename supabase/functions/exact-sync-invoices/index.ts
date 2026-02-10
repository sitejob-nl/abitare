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

// SalesEntries (financiële boekingen) - gebruikt voor diensten/facturen zonder artikelkoppeling
interface ExactSalesEntryLine {
  GLAccount: string;
  Description: string;
  AmountFC: number;
  VATCode: string;
}

interface ExactSalesEntry {
  Customer: string;
  EntryDate?: string;
  Journal: string;
  Description?: string;
  YourRef?: string;
  Currency: string;
  SalesEntryLines: ExactSalesEntryLine[];
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
      
      // Ensure customer is linked to Exact (auto-create if not)
      let accountId = customer?.exact_account_id;
      
      if (!accountId) {
        console.log(`Order #${order.order_number}: Klant niet gekoppeld, probeer automatisch te synchroniseren...`);
        accountId = await ensureCustomerInExact(
          supabase,
          accessToken,
          exactDivision,
          order.customer_id
        );
        
        if (!accountId) {
          results.skipped++;
          results.errors.push(`Order #${order.order_number}: Kon klant niet aanmaken in Exact Online`);
          continue;
        }
        console.log(`Order #${order.order_number}: Klant succesvol gekoppeld met Exact account ${accountId}`);
      }

      // Get default GL account for revenue (only once per batch)
      const glAccountId = await getDefaultRevenueGLAccount(accessToken, exactDivision);
      if (!glAccountId) {
        results.failed++;
        results.errors.push(`Order #${order.order_number}: Kon geen standaard omzet-grootboekrekening vinden in Exact`);
        continue;
      }

      // Get default sales journal (suitable for SalesEntries)
      const journalCode = await getDefaultSalesJournal(accessToken, exactDivision);

      // Build sales entry (financiële boeking)
      const exactEntry = mapToExactSalesEntry(order, accountId, glAccountId, journalCode);

      // Create sales entry in Exact (financieel endpoint - geen artikel vereist)
      const response = await fetch(
        `${EXACT_API_URL}/api/v1/${exactDivision}/salesentry/SalesEntries`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(exactEntry),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to create sales entry for order ${order.order_number}:`, errorText);
        results.failed++;
        results.errors.push(`Order #${order.order_number}: ${errorText}`);
      } else {
        const data = await response.json();
        const entryId = data.d?.EntryID;
        const entryNumber = data.d?.EntryNumber;

        if (entryId || entryNumber) {
          // Update order with Exact Entry ID (using EntryNumber as invoice reference)
          await supabase
            .from("orders")
            .update({ 
              exact_invoice_id: entryNumber?.toString() || entryId,
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

  // Get orders with Exact invoice IDs (EntryNumber from SalesEntries)
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

  // Fetch the full ReceivablesList in bulk (pagesize 1000) and build a lookup map
  // This is much more efficient than querying per order
  const receivablesMap = await fetchReceivablesList(accessToken, exactDivision);

  for (const order of orders) {
    try {
      const entryNumber = order.exact_invoice_id;

      // Look up this entry in the receivables map (keyed by EntryNumber)
      const receivable = receivablesMap.get(String(entryNumber));

      let amountPaid = 0;
      let paymentStatus: "open" | "deels_betaald" | "betaald" = "open";

      if (receivable) {
        const originalAmount = receivable.Amount || 0;
        const outstandingAmount = receivable.AmountDC || 0;
        amountPaid = Math.round((originalAmount - outstandingAmount) * 100) / 100;

        if (outstandingAmount <= 0.01) {
          paymentStatus = "betaald";
        } else if (amountPaid > 0.01) {
          paymentStatus = "deels_betaald";
        }
      } else {
        // Not found in receivables – could be fully paid (cleared) or not yet synced
        results.skipped++;
        continue;
      }

      // Update order if status changed
      if (paymentStatus !== order.payment_status || Math.abs(amountPaid - (order.amount_paid || 0)) > 0.01) {
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

/**
 * Fetch the full ReceivablesList from Exact Online using pagination ($top=1000).
 * Returns a Map keyed by EntryNumber (string) for fast lookup.
 * The ReceivablesList endpoint contains all open receivables (outstanding invoices).
 */
async function fetchReceivablesList(
  accessToken: string,
  exactDivision: number
): Promise<Map<string, { AmountDC: number; Amount: number; EntryNumber: number }>> {
  const receivablesMap = new Map<string, { AmountDC: number; Amount: number; EntryNumber: number }>();

  let hasMore = true;
  let skipToken = "";

  while (hasMore) {
    const url = `${EXACT_API_URL}/api/v1/${exactDivision}/read/financial/ReceivablesList?$select=EntryNumber,AmountDC,Amount&$top=1000${skipToken}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch ReceivablesList:", await response.text());
      break;
    }

    const data = await response.json();
    const items = data.d?.results || [];

    for (const item of items) {
      if (item.EntryNumber != null) {
        const key = String(item.EntryNumber);
        // If multiple receivable lines exist for the same entry, sum them
        const existing = receivablesMap.get(key);
        if (existing) {
          existing.AmountDC += item.AmountDC || 0;
          existing.Amount += item.Amount || 0;
        } else {
          receivablesMap.set(key, {
            EntryNumber: item.EntryNumber,
            AmountDC: item.AmountDC || 0,
            Amount: item.Amount || 0,
          });
        }
      }
    }

    // Check for next page
    const nextUrl = data.d?.__next;
    if (nextUrl && items.length > 0) {
      const tokenMatch = nextUrl.match(/\$skiptoken='([^']+)'/);
      if (tokenMatch) {
        skipToken = `&$skiptoken='${tokenMatch[1]}'`;
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${receivablesMap.size} receivables from Exact Online`);
  return receivablesMap;
}

/**
 * Map VAT rate percentage to Exact Online VATCode
 * 0% = "1", 9% = "4", 21% = "2"
 */
function mapVatRateToCode(vatRate: number): string {
  if (vatRate === 0) return "1";
  if (vatRate === 9) return "4";
  return "2"; // 21% (default)
}

/**
 * Get default revenue GL account from Exact Online
 * Type 110 = Revenue accounts (Omzet)
 * Prefer accounts starting with "80" (standard sales/revenue accounts)
 */
async function getDefaultRevenueGLAccount(
  accessToken: string,
  exactDivision: number
): Promise<string | null> {
  try {
    // Type 110 = Revenue accounts in Exact Online
    const url = `${EXACT_API_URL}/api/v1/${exactDivision}/financial/GLAccounts?$filter=Type eq 110&$select=ID,Code,Description&$orderby=Code`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Failed to fetch GL accounts:", await response.text());
      return null;
    }
    
    const data = await response.json();
    const accounts = data.d?.results || [];
    
    if (accounts.length === 0) {
      console.error("No revenue GL accounts (Type 110) found");
      return null;
    }
    
    // Prefer accounts starting with "80" (standard sales/revenue) or containing "omzet"
    const preferredAccount = accounts.find((acc: any) => 
      acc.Code?.startsWith("80") || 
      acc.Description?.toLowerCase().includes("omzet")
    );
    
    const selectedAccount = preferredAccount || accounts[0];
    console.log(`Using GL Account: ${selectedAccount.Code} - ${selectedAccount.Description}`);
    
    return selectedAccount.ID;
  } catch (err) {
    console.error("Error fetching GL accounts:", err);
    return null;
  }
}

/**
 * Get default sales journal suitable for SalesEntries.
 * Queries financial/Journals and filters for Type 50 (General journal) or Type 20 (Sales).
 * Prefers journals with "verkoop" in the description.
 */
async function getDefaultSalesJournal(
  accessToken: string,
  exactDivision: number
): Promise<string> {
  try {
    const url = `${EXACT_API_URL}/api/v1/${exactDivision}/financial/Journals?$filter=Type eq 50 or Type eq 20&$select=Code,Description,Type&$orderby=Type,Code`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch Journals:", await response.text());
      return "70"; // fallback
    }

    const data = await response.json();
    const journals = data.d?.results || [];

    if (journals.length === 0) {
      console.warn("No suitable journals found (Type 50/20), falling back to '70'");
      return "70";
    }

    // Prefer journals with "verkoop" in the description
    const preferred = journals.find((j: any) =>
      j.Description?.toLowerCase().includes("verkoop")
    );

    const selected = preferred || journals[0];
    console.log(`Using Journal: ${selected.Code} - ${selected.Description} (Type ${selected.Type})`);
    return selected.Code;
  } catch (err) {
    console.error("Error fetching journals:", err);
    return "70"; // fallback
  }
}

/**
 * Map order to Exact SalesEntry (financiele boeking).
 * Uses SalesEntries endpoint instead of SalesInvoices - no Item required.
 */
function mapToExactSalesEntry(order: AbitareOrder, accountId: string, glAccountId: string, journalCode: string): ExactSalesEntry {
  const lines: ExactSalesEntryLine[] = [];
  
  const orderLines = order.order_lines || (order as any).order_lines || [];
  
  for (const line of orderLines) {
    // Skip group headers
    if ((line as any).is_group_header) continue;
    
    lines.push({
      GLAccount: glAccountId,
      Description: line.description.substring(0, 100), // Max 100 chars in Exact
      AmountFC: line.line_total || (line.unit_price * (line.quantity || 1)),
      VATCode: mapVatRateToCode(line.vat_rate || 21),
    });
  }

  // If no lines, create a single line with total
  if (lines.length === 0) {
    lines.push({
      GLAccount: glAccountId,
      Description: `Order #${order.order_number}`,
      AmountFC: order.total_excl_vat || 0,
      VATCode: "2", // 21%
    });
  }

  return {
    Customer: accountId,
    EntryDate: order.order_date || new Date().toISOString().split("T")[0],
    Journal: journalCode,
    Description: `Factuur order #${order.order_number}`,
    YourRef: `ORD-${order.order_number}`,
    Currency: "EUR",
    SalesEntryLines: lines,
  };
}

// ============= Customer Auto-Sync Functions =============

/**
 * Ensures a customer exists in Exact Online. 
 * If not linked, tries to find by customer_number or creates a new account.
 */
async function ensureCustomerInExact(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  customerId: string
): Promise<string | null> {
  try {
    // 1. Fetch customer from database
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();
    
    if (error || !customer) {
      console.error("Customer not found:", customerId);
      return null;
    }
    
    // 2. Already linked? Return existing ID
    if (customer.exact_account_id) {
      return customer.exact_account_id;
    }
    
    // 3. Try to find existing account in Exact by customer_number
    const existingAccountId = await findExactAccountByCode(
      accessToken, 
      exactDivision, 
      customer.customer_number
    );
    
    if (existingAccountId) {
      console.log(`Found existing Exact account ${existingAccountId} for customer ${customer.customer_number}`);
      // Link existing account to customer
      await supabase
        .from("customers")
        .update({ exact_account_id: existingAccountId })
        .eq("id", customerId);
      return existingAccountId;
    }
    
    // 4. Create new account in Exact
    const newAccountId = await createExactAccount(
      accessToken, 
      exactDivision, 
      customer
    );
    
    if (newAccountId) {
      console.log(`Created new Exact account ${newAccountId} for customer ${customer.customer_number}`);
      await supabase
        .from("customers")
        .update({ exact_account_id: newAccountId })
        .eq("id", customerId);
    }
    
    return newAccountId;
  } catch (err) {
    console.error("Error ensuring customer in Exact:", err);
    return null;
  }
}

/**
 * Search for an existing Exact Online account by Code (customer_number)
 */
async function findExactAccountByCode(
  accessToken: string,
  exactDivision: number,
  customerNumber: number
): Promise<string | null> {
  try {
    // Search by Code (customer number as string)
    const code = String(customerNumber);
    const url = `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts?$filter=Code eq '${code}'&$select=ID,Code,Name`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Failed to search Exact accounts:", await response.text());
      return null;
    }
    
    const data = await response.json();
    const accounts = data.d?.results || [];
    
    if (accounts.length > 0) {
      return accounts[0].ID;
    }
    
    return null;
  } catch (err) {
    console.error("Error searching Exact account:", err);
    return null;
  }
}

/**
 * Create a new account in Exact Online
 */
async function createExactAccount(
  accessToken: string,
  exactDivision: number,
  // deno-lint-ignore no-explicit-any
  customer: any
): Promise<string | null> {
  try {
    // Determine name: company_name or first_name + last_name
    const name = customer.company_name 
      ? customer.company_name 
      : [customer.first_name, customer.last_name].filter(Boolean).join(" ");
    
    // Build account data
    const accountData: Record<string, unknown> = {
      Code: String(customer.customer_number),
      Name: name || `Klant ${customer.customer_number}`,
      Status: "C", // Customer
    };
    
    // Add optional fields if available
    if (customer.email) accountData.Email = customer.email;
    if (customer.phone) accountData.Phone = customer.phone;
    if (customer.mobile) accountData.PhoneMobile = customer.mobile;
    if (customer.city) accountData.City = customer.city;
    if (customer.postal_code) accountData.Postcode = customer.postal_code;
    if (customer.street_address) accountData.AddressLine1 = customer.street_address;
    if (customer.country) accountData.Country = customer.country === "Nederland" ? "NL" : customer.country;
    if (customer.vat_number) accountData.VATNumber = customer.vat_number;
    if (customer.coc_number) accountData.ChamberOfCommerce = customer.coc_number;
    
    const response = await fetch(
      `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(accountData),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create Exact account:", errorText);
      return null;
    }
    
    const data = await response.json();
    return data.d?.ID || null;
  } catch (err) {
    console.error("Error creating Exact account:", err);
    return null;
  }
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
