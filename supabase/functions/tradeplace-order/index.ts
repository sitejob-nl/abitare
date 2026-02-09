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

    // Build TradeXML 2.0 OrderPlacementRequest
    const xmlRequest = buildOrderRequest(
      retailerGln, 
      supplier.tradeplace_gln, 
      supplierOrder,
      supplierOrder.lines
    );

    // Send to TMH2
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/messages/tp/${encodeURIComponent(tpId)}`;

    console.log(`Sending order to TMH2: ${apiUrl}`);

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

      // Update order with error
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

    // Parse external order ID from response if available
    const externalIdMatch = responseText.match(/<OrderID>([^<]+)<\/OrderID>/i) 
      || responseText.match(/<ExternalOrderID>([^<]+)<\/ExternalOrderID>/i);
    const externalOrderId = externalIdMatch?.[1] || `TMH2-${Date.now()}`;

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

function buildOrderRequest(
  senderGln: string,
  receiverGln: string,
  order: any,
  lines: any[]
): string {
  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const orderLines = lines.map((line: any, index: number) => `
    <OrderLine>
      <LineNumber>${index + 1}</LineNumber>
      <EAN>${escapeXml(line.ean_code || '')}</EAN>
      <Quantity>${line.quantity}</Quantity>
      <UnitPrice>${line.unit_price || 0}</UnitPrice>
    </OrderLine>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OrderPlacementRequest xmlns="http://www.tradeplace.com/schema/pi">
  <Header>
    <MessageID>${messageId}</MessageID>
    <Timestamp>${timestamp}</Timestamp>
    <SenderGLN>${escapeXml(senderGln)}</SenderGLN>
    <ReceiverGLN>${escapeXml(receiverGln)}</ReceiverGLN>
  </Header>
  <Order>
    <OrderID>${escapeXml(order.id)}</OrderID>
    <OrderDate>${new Date().toISOString().split('T')[0]}</OrderDate>
    <OrderLines>${orderLines}
    </OrderLines>
  </Order>
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
