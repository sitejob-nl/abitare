import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret if configured
    const webhookSecret = Deno.env.get("TRADEPLACE_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("X-Webhook-Secret");

    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({
        error: "unauthorized",
        message: "Invalid webhook secret"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.text();
    console.log("Received webhook:", body.substring(0, 500));

    // Parse XML body
    const messageType = detectMessageType(body);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (messageType) {
      case 'OrderConfirmation':
        await handleOrderConfirmation(supabase, body);
        break;
      case 'ShippingNotification':
        await handleShippingNotification(supabase, body);
        break;
      case 'PriceListUpdate':
        await handlePriceListUpdate(supabase, body);
        break;
      default:
        console.log("Unknown message type:", messageType);
    }

    return new Response(JSON.stringify({
      success: true,
      message_type: messageType,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Tradeplace webhook error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function detectMessageType(xml: string): string {
  if (xml.includes('<OrderConfirmation')) return 'OrderConfirmation';
  if (xml.includes('<ShippingNotification')) return 'ShippingNotification';
  if (xml.includes('<PriceList')) return 'PriceListUpdate';
  return 'Unknown';
}

async function handleOrderConfirmation(supabase: any, xml: string) {
  // Extract order ID from XML (simplified - would use proper XML parser in production)
  const orderIdMatch = xml.match(/<OrderID>([^<]+)<\/OrderID>/);
  const externalOrderIdMatch = xml.match(/<ExternalOrderID>([^<]+)<\/ExternalOrderID>/);
  const confirmationDateMatch = xml.match(/<ConfirmationDate>([^<]+)<\/ConfirmationDate>/);
  const expectedDeliveryMatch = xml.match(/<ExpectedDeliveryDate>([^<]+)<\/ExpectedDeliveryDate>/);

  if (!orderIdMatch && !externalOrderIdMatch) {
    console.error("Could not find order ID in confirmation");
    return;
  }

  const orderId = orderIdMatch?.[1];
  const externalOrderId = externalOrderIdMatch?.[1];

  // Find supplier order
  let query = supabase.from("supplier_orders").select("id");
  
  if (orderId) {
    query = query.eq("id", orderId);
  } else if (externalOrderId) {
    query = query.eq("external_order_id", externalOrderId);
  }

  const { data: supplierOrder, error } = await query.single();

  if (error || !supplierOrder) {
    console.error("Supplier order not found for confirmation");
    return;
  }

  // Update order status
  await supabase
    .from("supplier_orders")
    .update({
      status: 'confirmed',
      confirmed_at: confirmationDateMatch?.[1] || new Date().toISOString(),
      expected_delivery_date: expectedDeliveryMatch?.[1] || null,
      xml_response: xml
    })
    .eq("id", supplierOrder.id);

  console.log("Order confirmed:", supplierOrder.id);
}

async function handleShippingNotification(supabase: any, xml: string) {
  // Extract shipping details from XML
  const orderIdMatch = xml.match(/<OrderID>([^<]+)<\/OrderID>/);
  const externalOrderIdMatch = xml.match(/<ExternalOrderID>([^<]+)<\/ExternalOrderID>/);
  const trackingNumberMatch = xml.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
  const shippedDateMatch = xml.match(/<ShippedDate>([^<]+)<\/ShippedDate>/);
  const expectedDeliveryMatch = xml.match(/<ExpectedDeliveryDate>([^<]+)<\/ExpectedDeliveryDate>/);

  const orderId = orderIdMatch?.[1];
  const externalOrderId = externalOrderIdMatch?.[1];

  // Find supplier order
  let query = supabase.from("supplier_orders").select("id");
  
  if (orderId) {
    query = query.eq("id", orderId);
  } else if (externalOrderId) {
    query = query.eq("external_order_id", externalOrderId);
  }

  const { data: supplierOrder, error } = await query.single();

  if (error || !supplierOrder) {
    console.error("Supplier order not found for shipping notification");
    return;
  }

  // Update order status
  await supabase
    .from("supplier_orders")
    .update({
      status: 'shipped',
      expected_delivery_date: expectedDeliveryMatch?.[1] || null,
      notes: trackingNumberMatch ? `Tracking: ${trackingNumberMatch[1]}` : null
    })
    .eq("id", supplierOrder.id);

  // Update line statuses
  await supabase
    .from("supplier_order_lines")
    .update({ status: 'shipped' })
    .eq("supplier_order_id", supplierOrder.id);

  console.log("Shipping notification processed:", supplierOrder.id);
}

async function handlePriceListUpdate(supabase: any, xml: string) {
  // TODO: Implement price list synchronization
  // This would update product_prices table with new prices from supplier
  console.log("Price list update received - processing not yet implemented");
}
