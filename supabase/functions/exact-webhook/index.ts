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
    if (!supabaseUrl || !supabaseServiceKey) return new Response("Configuration error", { status: 500 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const receivedSecret = req.headers.get("X-Webhook-Secret");
    if (!receivedSecret) {
      console.error("Missing X-Webhook-Secret header");
      return new Response("Unauthorized", { status: 401 });
    }

    const rawContent = await req.json();
    // Defensive: Exact sends { Content: {...}, HashCode: "..." }, but Connect may unwrap
    const content = rawContent.Content || rawContent;
    const { Topic, Division, Key, ExactOnlineEndpoint, EventAction } = content;

    console.log(`Received webhook: ${EventAction} on ${Topic} - Key: ${Key}`);

    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("id, division_id, webhook_secret, tenant_id")
      .eq("exact_division", Division)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      console.log("No connection found for division:", Division);
      return new Response("OK", { status: 200 });
    }

    const { decryptToken, isEncrypted } = await import("../_shared/crypto.ts");
    let storedSecret = connection.webhook_secret;
    if (storedSecret && isEncrypted(storedSecret)) {
      storedSecret = await decryptToken(storedSecret);
    }

    if (storedSecret !== receivedSecret) {
      console.error("Invalid webhook secret for division:", Division);
      return new Response("Unauthorized", { status: 401 });
    }

    // Log the webhook event
    await supabase.from("exact_webhook_logs").insert({
      connection_id: connection.id,
      topic: Topic,
      action: EventAction || "Unknown",
      exact_division: Division,
      entity_key: Key,
      endpoint: ExactOnlineEndpoint,
      processed: false,
    });

    // Get access token for fetching data from Exact
    let accessToken: string | null = null;
    let baseUrl: string | null = null;
    try {
      const tokenData = await getExactTokenFromConnection(connection);
      accessToken = tokenData.access_token;
      baseUrl = tokenData.base_url;
    } catch (err) {
      console.error("Could not get access token for webhook processing:", err);
    }

    // Process based on topic
    switch (Topic) {
      case "Accounts":
      case "CRM.Accounts":
        await processAccountWebhook(supabase, connection, content, accessToken, baseUrl, Division);
        break;
      case "SalesInvoices":
      case "SalesInvoice.SalesInvoices":
        await processInvoiceWebhook(supabase, content, accessToken, baseUrl, Division);
        break;
      case "SalesOrders":
      case "SalesOrder.SalesOrders":
        await processSalesOrderWebhook(supabase, content, accessToken, baseUrl, Division);
        break;
      case "Items":
      case "Logistics.Items":
        await processItemWebhook(supabase, content, accessToken, baseUrl, Division);
        break;
      case "Quotations":
      case "CRM.Quotations":
        await processQuotationWebhook(supabase, content, accessToken, baseUrl, Division);
        break;
      default:
        console.log("Unhandled topic:", Topic);
    }

    // Mark as processed
    await supabase.from("exact_webhook_logs").update({
      processed: true,
      processed_at: new Date().toISOString(),
    }).eq("entity_key", Key).eq("topic", Topic);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

// deno-lint-ignore no-explicit-any
async function fetchExactEntity(accessToken: string, baseUrl: string, division: number, endpoint: string): Promise<any | null> {
  try {
    const url = `${baseUrl}${endpoint}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    return data.d;
  } catch { return null; }
}

// deno-lint-ignore no-explicit-any
async function processAccountWebhook(supabase: any, connection: { id: string; division_id: string }, content: any, accessToken: string | null, baseUrl: string | null, exactDivision: number) {
  console.log(`Processing Account webhook: ${content.EventAction} - ${content.Key}`);

  if (content.EventAction === "Delete") {
    await supabase
      .from("customers")
      .update({ exact_account_id: null })
      .eq("exact_account_id", content.Key)
      .eq("division_id", connection.division_id);
    return;
  }

  // Create/Update: fetch account data and upsert
  if (accessToken && baseUrl) {
    const account = await fetchExactEntity(accessToken, baseUrl, exactDivision, `/api/v1/${exactDivision}/crm/Accounts(guid'${content.Key}')?$select=ID,Code,Name,Email,Phone,City,Postcode,AddressLine1`);
    if (account) {
      // Try to find existing customer
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("exact_account_id", content.Key)
        .eq("division_id", connection.division_id)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing
        const updates: Record<string, unknown> = {};
        if (account.Email) updates.email = account.Email;
        if (account.Phone) updates.phone = account.Phone;
        if (account.City) updates.city = account.City;
        if (account.Postcode) updates.postal_code = account.Postcode;
        if (Object.keys(updates).length > 0) {
          await supabase.from("customers").update(updates).eq("id", existing[0].id);
        }
      }
      console.log(`Account ${content.Key} processed: ${account.Name}`);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processInvoiceWebhook(supabase: any, content: any, accessToken: string | null, baseUrl: string | null, exactDivision: number) {
  console.log(`Processing Invoice webhook: ${content.EventAction} - ${content.Key}`);

  if (accessToken && baseUrl && content.EventAction !== "Delete") {
    const invoice = await fetchExactEntity(accessToken, baseUrl, exactDivision, `/api/v1/${exactDivision}/salesinvoice/SalesInvoices(guid'${content.Key}')?$select=InvoiceID,InvoiceNumber,AmountDC,Status,OrderedBy`);
    if (invoice) {
      // Find order by exact_invoice_id
      const { data: order } = await supabase
        .from("orders")
        .select("id, total_incl_vat")
        .eq("exact_invoice_id", content.Key)
        .limit(1);

      if (order && order.length > 0) {
        const totalIncl = order[0].total_incl_vat || 0;
        const amountDC = invoice.AmountDC || 0;
        const amountPaid = Math.max(0, totalIncl - amountDC);
        let paymentStatus: "open" | "deels_betaald" | "betaald" = "open";
        if (amountDC <= 0.01) paymentStatus = "betaald";
        else if (amountPaid > 0.01) paymentStatus = "deels_betaald";

        await supabase.from("orders").update({
          payment_status: paymentStatus,
          amount_paid: amountPaid,
        }).eq("id", order[0].id);
        console.log(`Invoice ${content.Key}: payment status updated to ${paymentStatus}`);
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processSalesOrderWebhook(supabase: any, content: any, accessToken: string | null, baseUrl: string | null, exactDivision: number) {
  console.log(`Processing SalesOrder webhook: ${content.EventAction} - ${content.Key}`);

  if (accessToken && baseUrl && content.EventAction !== "Delete") {
    const salesOrder = await fetchExactEntity(accessToken, baseUrl, exactDivision, `/api/v1/${exactDivision}/salesorder/SalesOrders(guid'${content.Key}')?$select=OrderID,OrderNumber,Status,StatusDescription`);
    if (salesOrder) {
      // Find order by exact_sales_order_id
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .eq("exact_sales_order_id", content.Key)
        .limit(1);

      if (order && order.length > 0) {
        console.log(`SalesOrder ${content.Key}: status=${salesOrder.StatusDescription}`);
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processItemWebhook(supabase: any, content: any, accessToken: string | null, baseUrl: string | null, exactDivision: number) {
  console.log(`Processing Item webhook: ${content.EventAction} - ${content.Key}`);

  if (accessToken && baseUrl && content.EventAction !== "Delete") {
    const item = await fetchExactEntity(accessToken, baseUrl, exactDivision, `/api/v1/${exactDivision}/logistics/Items(guid'${content.Key}')?$select=ID,Code,Description,CostPriceStandard,IsSalesItem`);
    if (item && item.Code) {
      // Find product by article_code and update exact_item_id
      const { data: products } = await supabase
        .from("products")
        .select("id, exact_item_id")
        .eq("article_code", item.Code)
        .limit(1);

      if (products && products.length > 0) {
        const updates: Record<string, unknown> = { exact_item_id: item.ID };
        if (item.CostPriceStandard != null) updates.cost_price = item.CostPriceStandard;
        await supabase.from("products").update(updates).eq("id", products[0].id);
        console.log(`Item ${item.Code}: linked to product ${products[0].id}`);
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processQuotationWebhook(supabase: any, content: any, accessToken: string | null, baseUrl: string | null, exactDivision: number) {
  console.log(`Processing Quotation webhook: ${content.EventAction} - ${content.Key}`);

  if (accessToken && baseUrl && content.EventAction !== "Delete") {
    const quotation = await fetchExactEntity(accessToken, baseUrl, exactDivision, `/api/v1/${exactDivision}/crm/Quotations(guid'${content.Key}')?$select=QuotationID,QuotationNumber,StatusDescription,Status`);
    if (quotation) {
      const { data: quote } = await supabase
        .from("quotes")
        .select("id, status")
        .eq("exact_quotation_id", content.Key)
        .limit(1);

      if (quote && quote.length > 0) {
        let localStatus: string | null = null;
        const exactStatus = quotation.StatusDescription;
        if (exactStatus === "Accepted" || exactStatus === "Geaccepteerd") localStatus = "accepted";
        else if (exactStatus === "Rejected" || exactStatus === "Afgewezen") localStatus = "rejected";

        if (localStatus && localStatus !== quote[0].status) {
          await supabase.from("quotes").update({ status: localStatus }).eq("id", quote[0].id);
          console.log(`Quotation ${content.Key}: status updated to ${localStatus}`);
        }
      }
    }
  }
}
