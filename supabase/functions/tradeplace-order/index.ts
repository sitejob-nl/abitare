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

function tradeplaceDate(date: Date): string {
  return `<Year>${date.getFullYear()}</Year><Month>${String(date.getMonth() + 1).padStart(2, '0')}</Month><Day>${String(date.getDate()).padStart(2, '0')}</Day>`;
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
        message: "Tradeplace is nog niet geconfigureerd. Ga naar Instellingen > Koppelingen.",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { supplier_order_id } = await req.json();

    if (!supplier_order_id) {
      return new Response(JSON.stringify({
        error: "invalid_request",
        message: "supplier_order_id is verplicht"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: supplierOrder, error: orderError } = await supabase
      .from("supplier_orders")
      .select(`
        *,
        supplier:suppliers(*),
        lines:supplier_order_lines(*)
      `)
      .eq("id", supplier_order_id)
      .single();

    if (orderError || !supplierOrder) {
      return new Response(JSON.stringify({
        error: "order_not_found",
        message: "Leveranciersorder niet gevonden"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (supplierOrder.status !== 'pending') {
      return new Response(JSON.stringify({
        error: "invalid_status",
        message: `Order kan niet worden verzonden. Huidige status: ${supplierOrder.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supplier = supplierOrder.supplier;
    if (!supplier.tradeplace_enabled || !supplier.tradeplace_gln) {
      return new Response(JSON.stringify({
        error: "supplier_not_configured",
        message: `${supplier.name} is niet gekoppeld aan Tradeplace`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const tpId = supplier.tradeplace_tp_id;
    if (!tpId) {
      return new Response(JSON.stringify({
        error: "supplier_tp_id_missing",
        message: `${supplier.name} heeft geen Tradeplace TP-ID. Configureer dit in leveranciersinstellingen.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Build TradeXML 2.1.19 OrderPlacementRequest
    const xmlRequest = buildOrderPlacementRequest(
      retailerGln,
      supplier.tradeplace_gln,
      supplierOrder,
      supplierOrder.lines
    );

    // Send to TMH2
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/messages/tp/${encodeURIComponent(tpId)}`;

    console.log(`Sending OrderPlacementRequest to TMH2: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(),
        "Content-Type": "application/xml",
      },
      body: xmlRequest,
    });

    const responseText = await response.text();
    console.log(`TMH2 order response status: ${response.status}`);

    if (!response.ok) {
      console.error("TMH2 order error:", responseText);

      await supabase
        .from("supplier_orders")
        .update({
          xml_request: xmlRequest,
          xml_response: responseText,
          notes: `TMH2 fout (${response.status}): ${responseText.substring(0, 200)}`,
        })
        .eq("id", supplier_order_id);

      return new Response(JSON.stringify({
        success: false,
        error: "tmh2_error",
        message: `TMH2 fout (${response.status}): bestelling niet geaccepteerd`,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse TradeXML response: look for SalesDocumentNumber (supplier's order ID)
    // or PurchaseOrderNumber (our order ID echoed back)
    const salesDocMatch = responseText.match(/<SalesDocumentNumber>([^<]+)<\/SalesDocumentNumber>/);
    const purchaseOrderMatch = responseText.match(/<PurchaseOrderNumber>([^<]+)<\/PurchaseOrderNumber>/);
    const externalOrderId = salesDocMatch?.[1] || purchaseOrderMatch?.[1] || `TMH2-${Date.now()}`;

    // Update supplier order status
    const { error: updateError } = await supabase
      .from("supplier_orders")
      .update({
        status: 'sent',
        external_order_id: externalOrderId,
        sent_at: new Date().toISOString(),
        xml_request: xmlRequest,
        xml_response: responseText,
      })
      .eq("id", supplier_order_id);

    if (updateError) {
      throw updateError;
    }

    // Update line statuses
    await supabase
      .from("supplier_order_lines")
      .update({ status: 'confirmed' })
      .eq("supplier_order_id", supplier_order_id);

    return new Response(JSON.stringify({
      success: true,
      external_order_id: externalOrderId,
      message: "Bestelling is verzonden via TMH2",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Tradeplace order error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

/**
 * Build a TradeXML 2.1.19 compliant OrderPlacementRequest
 */
function buildOrderPlacementRequest(
  customerGln: string,
  sellerGln: string,
  order: any,
  lines: any[]
): string {
  const now = new Date();
  
  // Requested delivery date: use expected_delivery_date from order, or 14 days from now
  const deliveryDate = order.expected_delivery_date
    ? new Date(order.expected_delivery_date)
    : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const lineItems = lines.map((line: any, index: number) => {
    const lineXml = [
      `      <OrderPlacementRequestLineItem>`,
      `        <LineItemNumber>${index + 1}</LineItemNumber>`,
      `        <Material materialQualifier="EAN">${escapeXml(line.ean_code || '')}</Material>`,
      `        <QuantityRequested>${line.quantity}</QuantityRequested>`,
    ];

    // Add optional CustomerExpectedPrice if we have a unit price
    if (line.unit_price && line.unit_price > 0) {
      lineXml.push(`        <CustomerExpectedPrice>${line.unit_price}</CustomerExpectedPrice>`);
    }

    // Add optional article code as CustomerMaterial
    if (line.article_code) {
      lineXml.push(`        <CustomerMaterial>${escapeXml(line.article_code)}</CustomerMaterial>`);
    }

    lineXml.push(`      </OrderPlacementRequestLineItem>`);
    return lineXml.join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE OrderPlacementRequest SYSTEM "TradeXML.dtd">
<OrderPlacementRequest>
  <OrderPlacementRequestHeader>
    <MessageType>OrderPlacementRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">${escapeXml(customerGln)}</CustomerCode>
    <SellerCode>${escapeXml(sellerGln)}</SellerCode>
    <RequestedDeliveryDate>
      ${tradeplaceDate(deliveryDate)}
    </RequestedDeliveryDate>
    <PurchaseOrderNumber>${escapeXml(order.id)}</PurchaseOrderNumber>
    <PurchaseOrderDate>
      ${tradeplaceDate(now)}
    </PurchaseOrderDate>
  </OrderPlacementRequestHeader>
  <OrderPlacementRequestLineItems>
${lineItems}
  </OrderPlacementRequestLineItems>
</OrderPlacementRequest>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
