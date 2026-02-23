import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getBaseUrl(): string {
  const env = Deno.env.get("TRADEPLACE_ENVIRONMENT") || "test";
  return env === "live"
    ? "https://hub-api.tradeplace.com/hub"
    : "https://qhub-api.tradeplace.com/hub";
}

function getAuthHeader(): string {
  const username = Deno.env.get("TRADEPLACE_USERNAME")!;
  const password = Deno.env.get("TRADEPLACE_PASSWORD")!;
  return "Basic " + btoa(`${username}:${password}`);
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const username = Deno.env.get("TRADEPLACE_USERNAME");
    const password = Deno.env.get("TRADEPLACE_PASSWORD");
    const retailerGln = Deno.env.get("TRADEPLACE_RETAILER_GLN");

    if (!username || !password || !retailerGln) {
      return new Response(JSON.stringify({
        error: "not_configured",
        message: "Tradeplace is nog niet geconfigureerd.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { supplier_order_id, reason } = await req.json();
    if (!supplier_order_id) {
      return new Response(JSON.stringify({ error: "invalid_request", message: "supplier_order_id is verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: supplierOrder, error: orderError } = await supabase
      .from("supplier_orders")
      .select("*, supplier:suppliers(*)")
      .eq("id", supplier_order_id)
      .single();

    if (orderError || !supplierOrder) {
      return new Response(JSON.stringify({ error: "order_not_found", message: "Leveranciersorder niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!['sent', 'confirmed'].includes(supplierOrder.status)) {
      return new Response(JSON.stringify({
        error: "invalid_status",
        message: `Order kan niet worden geannuleerd. Huidige status: ${supplierOrder.status}`
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supplier = supplierOrder.supplier;
    if (!supplier?.tradeplace_enabled || !supplier?.tradeplace_gln || !supplier?.tradeplace_tp_id) {
      return new Response(JSON.stringify({ error: "supplier_not_configured", message: `${supplier?.name} is niet gekoppeld aan Tradeplace` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE OrderCancellationRequest SYSTEM "TradeXML.dtd">
<OrderCancellationRequest>
  <OrderCancellationRequestHeader>
    <MessageType>OrderCancellationRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">${escapeXml(retailerGln)}</CustomerCode>
    <SellerCode>${escapeXml(supplier.tradeplace_gln)}</SellerCode>
    <PurchaseOrderNumber>${escapeXml(supplier_order_id)}</PurchaseOrderNumber>${reason ? `\n    <CancellationReason>${escapeXml(reason)}</CancellationReason>` : ''}
  </OrderCancellationRequestHeader>
</OrderCancellationRequest>`;

    // Log outbound
    await supabase.from("tradeplace_messages").insert({
      message_type: 'OrderCancellationRequest',
      direction: 'outbound',
      supplier_order_id,
      supplier_id: supplier.id,
      raw_xml: xmlRequest,
    });

    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/messages/tp/${encodeURIComponent(supplier.tradeplace_tp_id)}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Authorization": getAuthHeader(), "Content-Type": "application/xml" },
      body: xmlRequest,
    });

    const responseText = await response.text();

    // Log inbound response
    await supabase.from("tradeplace_messages").insert({
      message_type: 'OrderCancellationReply',
      direction: 'inbound',
      supplier_order_id,
      supplier_id: supplier.id,
      raw_xml: responseText,
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false, error: "tmh2_error",
        message: `TMH2 fout (${response.status}): annulering niet geaccepteerd`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check for error codes in reply (rejection)
    const errorCodeMatch = responseText.match(/<ErrorCode>([^<]+)<\/ErrorCode>/);
    const errorTextMatch = responseText.match(/<ErrorText>([^<]+)<\/ErrorText>/);

    if (errorCodeMatch) {
      return new Response(JSON.stringify({
        success: false,
        rejected: true,
        error_code: errorCodeMatch[1],
        message: errorTextMatch?.[1] || `Annulering afgewezen door ${supplier.name} (code: ${errorCodeMatch[1]})`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cancellation accepted
    await supabase
      .from("supplier_orders")
      .update({ status: 'cancelled', xml_response: responseText })
      .eq("id", supplier_order_id);

    return new Response(JSON.stringify({
      success: true,
      message: "Bestelling is geannuleerd",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Tradeplace order-cancel error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
