import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if secrets are configured
    const apiKey = Deno.env.get("TRADEPLACE_API_KEY");
    const retailerGln = Deno.env.get("TRADEPLACE_RETAILER_GLN");

    if (!apiKey || !retailerGln) {
      return new Response(JSON.stringify({
        error: "not_configured",
        message: "Tradeplace is nog niet geconfigureerd. Ga naar Instellingen > Koppelingen.",
        missing: [
          !apiKey && "TRADEPLACE_API_KEY",
          !retailerGln && "TRADEPLACE_RETAILER_GLN"
        ].filter(Boolean)
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

    // Get supplier order with lines and supplier details
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

    // Build XML order request
    const xmlRequest = buildOrderRequest(
      retailerGln, 
      supplier.tradeplace_gln, 
      supplierOrder,
      supplierOrder.lines
    );
    
    console.log("Would send order XML:", xmlRequest);

    // TODO: Send to Tradeplace API when documentation is available
    // For now, simulate order placement

    // Generate mock external order ID
    const externalOrderId = `TP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    // Update supplier order status
    const { error: updateError } = await supabase
      .from("supplier_orders")
      .update({
        status: 'sent',
        external_order_id: externalOrderId,
        sent_at: new Date().toISOString(),
        xml_request: xmlRequest,
        xml_response: JSON.stringify({
          note: "Demo modus - echte response na Tradeplace activatie",
          simulated_order_id: externalOrderId
        })
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
      message: "Bestelling is geregistreerd (demo modus)",
      note: "Live orderplaatsing wordt actief na ontvangst Tradeplace API documentatie"
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
  
  const orderLines = lines.map((line, index) => `
    <OrderLine>
      <LineNumber>${index + 1}</LineNumber>
      <EAN>${escapeXml(line.ean_code || '')}</EAN>
      <Quantity>${line.quantity}</Quantity>
      <UnitPrice>${line.unit_price || 0}</UnitPrice>
    </OrderLine>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<OrderRequest xmlns="http://www.tradeplace.com/schema/pi">
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
</OrderRequest>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
