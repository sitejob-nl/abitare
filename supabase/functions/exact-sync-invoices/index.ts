import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getExactTokenFromConnection } from "../_shared/exact-connect.ts";

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
  customer?: { exact_account_id: string | null; last_name: string; company_name: string | null };
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
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, divisionId, orderId } = await req.json();
    if (!divisionId) throw new Error("divisionId is required");

    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections").select("*")
      .eq("division_id", divisionId).eq("is_active", true).single();

    if (connError || !connection) throw new Error("No active Exact Online connection found for this division");

    const tokenData = await getExactTokenFromConnection(connection);
    const accessToken = tokenData.access_token;
    const baseUrl = tokenData.base_url;
    const exactDivision = tokenData.division;

    if (action === "push") {
      return await pushInvoices(supabase, accessToken, baseUrl, exactDivision, divisionId, orderId);
    } else if (action === "pull_status") {
      return await pullPaymentStatus(supabase, accessToken, baseUrl, exactDivision, divisionId, orderId);
    } else if (action === "sync") {
      const pushResult = await pushInvoicesInternal(supabase, accessToken, baseUrl, exactDivision, divisionId, orderId);
      const pullResult = await pullPaymentStatusInternal(supabase, accessToken, baseUrl, exactDivision, divisionId);
      return new Response(JSON.stringify({ success: true, pushed: pushResult, pulled: pullResult }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid action. Use 'push', 'pull_status', or 'sync'");
    }
  } catch (error: unknown) {
    console.error("Invoice sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function pushInvoices(supabase: any, accessToken: string, baseUrl: string, exactDivision: number, divisionId: string, orderId?: string): Promise<Response> {
  const result = await pushInvoicesInternal(supabase, accessToken, baseUrl, exactDivision, divisionId, orderId);
  return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// deno-lint-ignore no-explicit-any
async function pushInvoicesInternal(supabase: any, accessToken: string, baseUrl: string, exactDivision: number, divisionId: string, orderId?: string) {
  let query = supabase.from("orders").select(`
    id, order_number, order_date, customer_id, total_excl_vat, total_vat, total_incl_vat,
    payment_status, amount_paid, exact_invoice_id, exact_sales_order_id, division_id,
    customers!inner(exact_account_id, last_name, company_name),
    order_lines(id, description, quantity, unit_price, vat_rate, line_total, article_code)
  `).eq("division_id", divisionId);

  if (orderId) { query = query.eq("id", orderId); }
  else { query = query.is("exact_invoice_id", null); }

  const { data: orders, error } = await query;
  if (error) throw error;

  const results = { success: true, created: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (const order of orders as AbitareOrder[]) {
    try {
      if (order.exact_invoice_id && !orderId) { results.skipped++; continue; }

      const customer = order.customer || (order as any).customers;
      let accountId = customer?.exact_account_id;
      
      if (!accountId) {
        accountId = await ensureCustomerInExact(supabase, accessToken, baseUrl, exactDivision, order.customer_id);
        if (!accountId) { results.skipped++; results.errors.push(`Order #${order.order_number}: Kon klant niet aanmaken in Exact Online`); continue; }
      }

      const glAccountId = await getDefaultRevenueGLAccount(accessToken, baseUrl, exactDivision);
      if (!glAccountId) { results.failed++; results.errors.push(`Order #${order.order_number}: Kon geen standaard omzet-grootboekrekening vinden`); continue; }

      const journalCode = await getDefaultSalesJournal(accessToken, baseUrl, exactDivision);
      const exactEntry = mapToExactSalesEntry(order, accountId, glAccountId, journalCode);

      const response = await fetch(`${baseUrl}/api/v1/${exactDivision}/salesentry/SalesEntries`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(exactEntry),
      });

      if (!response.ok) {
        const errorText = await response.text();
        results.failed++;
        results.errors.push(`Order #${order.order_number}: ${errorText}`);
      } else {
        const data = await response.json();
        const entryNumber = data.d?.EntryNumber;
        const entryId = data.d?.EntryID;
        if (entryId || entryNumber) {
          await supabase.from("orders").update({ exact_invoice_id: entryNumber?.toString() || entryId }).eq("id", order.id);
        }
        results.created++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push(`Order #${order.order_number}: ${String(err)}`);
    }
  }

  return results;
}

// deno-lint-ignore no-explicit-any
async function pullPaymentStatus(supabase: any, accessToken: string, baseUrl: string, exactDivision: number, divisionId: string, orderId?: string): Promise<Response> {
  const result = await pullPaymentStatusInternal(supabase, accessToken, baseUrl, exactDivision, divisionId, orderId);
  return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// deno-lint-ignore no-explicit-any
async function pullPaymentStatusInternal(supabase: any, accessToken: string, baseUrl: string, exactDivision: number, divisionId: string, orderId?: string) {
  const results = { success: true, updated: 0, skipped: 0, errors: [] as string[] };

  let query = supabase.from("orders")
    .select("id, order_number, exact_invoice_id, total_incl_vat, amount_paid, payment_status")
    .eq("division_id", divisionId).not("exact_invoice_id", "is", null);
  if (orderId) query = query.eq("id", orderId);

  const { data: orders, error } = await query;
  if (error) throw error;

  const receivablesMap = await fetchReceivablesList(accessToken, baseUrl, exactDivision);

  for (const order of orders) {
    try {
      const receivable = receivablesMap.get(String(order.exact_invoice_id));
      let amountPaid = 0;
      let paymentStatus: "open" | "deels_betaald" | "betaald" = "open";

      if (receivable) {
        amountPaid = Math.round((receivable.Amount - receivable.AmountDC) * 100) / 100;
        if (receivable.AmountDC <= 0.01) paymentStatus = "betaald";
        else if (amountPaid > 0.01) paymentStatus = "deels_betaald";
      } else {
        results.skipped++;
        continue;
      }

      if (paymentStatus !== order.payment_status || Math.abs(amountPaid - (order.amount_paid || 0)) > 0.01) {
        await supabase.from("orders").update({ payment_status: paymentStatus, amount_paid: amountPaid }).eq("id", order.id);
        results.updated++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.errors.push(`Order #${order.order_number}: ${String(err)}`);
    }
  }

  return results;
}

async function fetchReceivablesList(accessToken: string, baseUrl: string, exactDivision: number) {
  const receivablesMap = new Map<string, { AmountDC: number; Amount: number; EntryNumber: number }>();
  let hasMore = true;
  let skipToken = "";

  while (hasMore) {
    const url = `${baseUrl}/api/v1/${exactDivision}/read/financial/ReceivablesList?$select=EntryNumber,AmountDC,Amount&$top=1000${skipToken}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });

    if (!response.ok) { console.error("Failed to fetch ReceivablesList:", await response.text()); break; }

    const data = await response.json();
    const items = data.d?.results || [];

    for (const item of items) {
      if (item.EntryNumber != null) {
        const key = String(item.EntryNumber);
        const existing = receivablesMap.get(key);
        if (existing) { existing.AmountDC += item.AmountDC || 0; existing.Amount += item.Amount || 0; }
        else { receivablesMap.set(key, { EntryNumber: item.EntryNumber, AmountDC: item.AmountDC || 0, Amount: item.Amount || 0 }); }
      }
    }

    const nextUrl = data.d?.__next;
    if (nextUrl && items.length > 0) {
      const tokenMatch = nextUrl.match(/\$skiptoken='([^']+)'/);
      skipToken = tokenMatch ? `&$skiptoken='${tokenMatch[1]}'` : "";
      hasMore = !!skipToken;
    } else { hasMore = false; }
  }

  return receivablesMap;
}

function mapVatRateToCode(vatRate: number): string {
  if (vatRate === 0) return "1";
  if (vatRate === 9) return "4";
  return "2";
}

async function getDefaultRevenueGLAccount(accessToken: string, baseUrl: string, exactDivision: number): Promise<string | null> {
  try {
    const url = `${baseUrl}/api/v1/${exactDivision}/financial/GLAccounts?$filter=Type eq 110&$select=ID,Code,Description&$orderby=Code`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    const accounts = data.d?.results || [];
    if (accounts.length === 0) return null;
    const preferred = accounts.find((acc: any) => acc.Code?.startsWith("80") || acc.Description?.toLowerCase().includes("omzet"));
    return (preferred || accounts[0]).ID;
  } catch { return null; }
}

async function getDefaultSalesJournal(accessToken: string, baseUrl: string, exactDivision: number): Promise<string> {
  try {
    const url = `${baseUrl}/api/v1/${exactDivision}/financial/Journals?$filter=Type eq 50 or Type eq 20&$select=Code,Description,Type&$orderby=Type,Code`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (!response.ok) return "70";
    const data = await response.json();
    const journals = data.d?.results || [];
    if (journals.length === 0) return "70";
    const preferred = journals.find((j: any) => j.Description?.toLowerCase().includes("verkoop"));
    return (preferred || journals[0]).Code;
  } catch { return "70"; }
}

function mapToExactSalesEntry(order: AbitareOrder, accountId: string, glAccountId: string, journalCode: string): ExactSalesEntry {
  const lines: ExactSalesEntryLine[] = [];
  const orderLines = order.order_lines || (order as any).order_lines || [];
  
  for (const line of orderLines) {
    if ((line as any).is_group_header) continue;
    lines.push({
      GLAccount: glAccountId,
      Description: line.description.substring(0, 100),
      AmountFC: line.line_total || (line.unit_price * (line.quantity || 1)),
      VATCode: mapVatRateToCode(line.vat_rate || 21),
    });
  }

  if (lines.length === 0) {
    lines.push({ GLAccount: glAccountId, Description: `Order #${order.order_number}`, AmountFC: order.total_excl_vat || 0, VATCode: "2" });
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

// deno-lint-ignore no-explicit-any
async function ensureCustomerInExact(supabase: any, accessToken: string, baseUrl: string, exactDivision: number, customerId: string): Promise<string | null> {
  try {
    const { data: customer, error } = await supabase.from("customers").select("*").eq("id", customerId).single();
    if (error || !customer) return null;
    if (customer.exact_account_id) return customer.exact_account_id;

    const code = String(customer.customer_number);
    const searchUrl = `${baseUrl}/api/v1/${exactDivision}/crm/Accounts?$filter=Code eq '${code}'&$select=ID,Code,Name`;
    const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const existing = (searchData.d?.results || [])[0];
      if (existing?.ID) {
        await supabase.from("customers").update({ exact_account_id: existing.ID }).eq("id", customerId);
        return existing.ID;
      }
    } else { await searchRes.text(); }

    const name = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ");
    const accountData: Record<string, unknown> = { Code: code, Name: name || `Klant ${customer.customer_number}`, Status: "C" };
    if (customer.email) accountData.Email = customer.email;
    if (customer.phone) accountData.Phone = customer.phone;
    if (customer.city) accountData.City = customer.city;
    if (customer.postal_code) accountData.Postcode = customer.postal_code;
    if (customer.street_address) accountData.AddressLine1 = customer.street_address;

    const createRes = await fetch(`${baseUrl}/api/v1/${exactDivision}/crm/Accounts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(accountData),
    });
    if (!createRes.ok) { console.error("Failed to create Exact account:", await createRes.text()); return null; }
    const createData = await createRes.json();
    const newId = createData.d?.ID;
    if (newId) await supabase.from("customers").update({ exact_account_id: newId }).eq("id", customerId);
    return newId || null;
  } catch (err) { console.error("Error ensuring customer in Exact:", err); return null; }
}
