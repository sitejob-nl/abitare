import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // TMH2 sends messages via HTTP POST with Basic Auth or custom header
    // Verify authorization if configured
    const webhookSecret = Deno.env.get("TRADEPLACE_WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");
    const providedSecret = req.headers.get("X-Webhook-Secret");

    if (webhookSecret) {
      const isValid = providedSecret === webhookSecret || 
        (authHeader && authHeader === `Bearer ${webhookSecret}`);
      
      if (!isValid) {
        console.error("Invalid webhook authentication");
        return new Response(JSON.stringify({
          error: "unauthorized",
          message: "Invalid webhook authentication"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const body = await req.text();
    console.log("Received TMH2 webhook:", body.substring(0, 500));

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
      case 'OrderStatusUpdate':
        await handleOrderStatusUpdate(supabase, body);
        break;
      case 'BillingDocument':
        await handleBillingDocument(supabase, body);
        break;
      case 'PriceListUpdate':
        await handlePriceListUpdate(supabase, body);
        break;
      default:
        console.log("Unknown TMH2 message type, storing raw:", messageType);
    }

    // TMH2 expects 200 OK acknowledgment
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
  if (xml.includes('<OrderConfirmation') || xml.includes('<OrderResponse')) return 'OrderConfirmation';
  if (xml.includes('<ShippingNotification') || xml.includes('<DespatchAdvice')) return 'ShippingNotification';
  if (xml.includes('<OrderStatusUpdate') || xml.includes('<OrderStatus')) return 'OrderStatusUpdate';
  if (xml.includes('<BillingDocument') || xml.includes('<Invoice')) return 'BillingDocument';
  if (xml.includes('<PriceList') || xml.includes('<PriceCatalog')) return 'PriceListUpdate';
  return 'Unknown';
}

async function handleOrderConfirmation(supabase: any, xml: string) {
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

  let query = supabase.from("supplier_orders").select("id");
  if (orderId) query = query.eq("id", orderId);
  else if (externalOrderId) query = query.eq("external_order_id", externalOrderId);

  const { data: supplierOrder, error } = await query.single();
  if (error || !supplierOrder) {
    console.error("Supplier order not found for confirmation");
    return;
  }

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
  const orderIdMatch = xml.match(/<OrderID>([^<]+)<\/OrderID>/);
  const externalOrderIdMatch = xml.match(/<ExternalOrderID>([^<]+)<\/ExternalOrderID>/);
  const trackingNumberMatch = xml.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
  const expectedDeliveryMatch = xml.match(/<ExpectedDeliveryDate>([^<]+)<\/ExpectedDeliveryDate>/);

  const orderId = orderIdMatch?.[1];
  const externalOrderId = externalOrderIdMatch?.[1];

  let query = supabase.from("supplier_orders").select("id");
  if (orderId) query = query.eq("id", orderId);
  else if (externalOrderId) query = query.eq("external_order_id", externalOrderId);

  const { data: supplierOrder, error } = await query.single();
  if (error || !supplierOrder) {
    console.error("Supplier order not found for shipping notification");
    return;
  }

  await supabase
    .from("supplier_orders")
    .update({
      status: 'shipped',
      expected_delivery_date: expectedDeliveryMatch?.[1] || null,
      notes: trackingNumberMatch ? `Tracking: ${trackingNumberMatch[1]}` : null
    })
    .eq("id", supplierOrder.id);

  await supabase
    .from("supplier_order_lines")
    .update({ status: 'shipped' })
    .eq("supplier_order_id", supplierOrder.id);

  console.log("Shipping notification processed:", supplierOrder.id);
}

async function handleOrderStatusUpdate(supabase: any, xml: string) {
  const orderIdMatch = xml.match(/<OrderID>([^<]+)<\/OrderID>/);
  const statusMatch = xml.match(/<Status>([^<]+)<\/Status>/);
  
  if (!orderIdMatch) {
    console.error("No order ID in status update");
    return;
  }

  const { data: supplierOrder } = await supabase
    .from("supplier_orders")
    .select("id")
    .eq("id", orderIdMatch[1])
    .single();

  if (supplierOrder && statusMatch) {
    console.log(`Order status update: ${supplierOrder.id} -> ${statusMatch[1]}`);
  }
}

async function handleBillingDocument(supabase: any, xml: string) {
  console.log("Billing document received - storing for processing");
  // Future: parse invoice data and link to order
}

async function handlePriceListUpdate(supabase: any, xml: string) {
  console.log("Price list update received - processing not yet implemented");
}
