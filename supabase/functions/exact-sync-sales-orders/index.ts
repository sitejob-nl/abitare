import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getExactTokenFromConnection } from "../_shared/exact-connect.ts";

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
      const result = await pushSalesOrders(supabase, accessToken, baseUrl, exactDivision, divisionId, orderId);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid action. Use 'push'");
    }
  } catch (error: unknown) {
    console.error("Sales order sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function pushSalesOrders(supabase: any, accessToken: string, baseUrl: string, exactDivision: number, divisionId: string, orderId?: string) {
  let query = supabase.from("orders").select(`
    id, order_number, order_date, customer_id, total_excl_vat, total_vat, total_incl_vat,
    exact_sales_order_id, exact_sales_order_number, division_id, internal_notes,
    delivery_street_address, delivery_postal_code, delivery_city,
    customers!inner(exact_account_id, last_name, company_name, customer_number, email, phone, mobile,
      street_address, postal_code, city, country, vat_number, coc_number, first_name, customer_type),
    order_lines(id, description, quantity, unit_price, vat_rate, line_total, article_code, is_group_header)
  `).eq("division_id", divisionId);

  if (orderId) { query = query.eq("id", orderId); }
  else { query = query.is("exact_sales_order_id", null); }

  const { data: orders, error } = await query;
  if (error) throw error;

  const results = { success: true, created: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (const order of orders) {
    try {
      if (order.exact_sales_order_id && !orderId) { results.skipped++; continue; }

      const customer = order.customers;
      let accountId = customer?.exact_account_id;

      if (!accountId) {
        accountId = await ensureCustomerInExact(supabase, accessToken, baseUrl, exactDivision, order.customer_id);
        if (!accountId) { results.failed++; results.errors.push(`Order #${order.order_number}: Kon klant niet aanmaken in Exact Online`); continue; }
      }

      const salesOrderLines = (order.order_lines || [])
        .filter((l: any) => !l.is_group_header)
        .map((line: any) => ({
          Description: (line.description || "").substring(0, 60),
          Quantity: line.quantity || 1,
          NetPrice: line.unit_price || 0,
          VATCode: mapVatRateToCode(line.vat_rate || 21),
        }));

      if (salesOrderLines.length === 0) {
        salesOrderLines.push({ Description: `Order #${order.order_number}`, Quantity: 1, NetPrice: order.total_excl_vat || 0, VATCode: "2" });
      }

      const salesOrder = {
        OrderedBy: accountId,
        DeliverTo: accountId,
        Description: `Order #${order.order_number}`,
        OrderDate: order.order_date || new Date().toISOString().split("T")[0],
        YourRef: `ORD-${order.order_number}`,
        Currency: "EUR",
        SalesOrderLines: salesOrderLines,
      };

      const response = await fetch(`${baseUrl}/api/v1/${exactDivision}/salesorder/SalesOrders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(salesOrder),
      });

      if (!response.ok) {
        const errorText = await response.text();
        results.failed++;
        results.errors.push(`Order #${order.order_number}: ${errorText}`);
      } else {
        const data = await response.json();
        const soId = data.d?.OrderID;
        const soNumber = data.d?.OrderNumber;
        if (soId || soNumber) {
          await supabase.from("orders").update({
            exact_sales_order_id: soId || null,
            exact_sales_order_number: soNumber?.toString() || null,
          }).eq("id", order.id);
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

function mapVatRateToCode(vatRate: number): string {
  if (vatRate === 0) return "1";
  if (vatRate === 9) return "4";
  return "2";
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
    if (!createRes.ok) return null;
    const createData = await createRes.json();
    const newId = createData.d?.ID;
    if (newId) await supabase.from("customers").update({ exact_account_id: newId }).eq("id", customerId);
    return newId || null;
  } catch (err) { console.error("Error ensuring customer in Exact:", err); return null; }
}
