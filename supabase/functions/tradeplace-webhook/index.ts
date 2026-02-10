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
    console.log("Detected TradeXML message type:", messageType);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (messageType) {
      case 'OrderPlacementReply':
        await handleOrderPlacementReply(supabase, body);
        break;
      case 'PushOrderConfirmation':
        await handlePushOrderConfirmation(supabase, body);
        break;
      case 'ShippingNotification':
      case 'ShipmentNotification':
        await handleShippingNotification(supabase, body);
        break;
      case 'PushOrderStatus':
      case 'OrderStatusReply':
        await handleOrderStatusUpdate(supabase, body);
        break;
      case 'BillingDocument':
        await handleBillingDocument(supabase, body);
        break;
      case 'PushProductList':
        await handlePushProductList(supabase, body);
        break;
      case 'PushOrderChangeConfirmation':
        await handleOrderChangeConfirmation(supabase, body);
        break;
      case 'OrderCancellationReply':
        await handleOrderCancellationReply(supabase, body);
        break;
      case 'Acknowledgement':
        console.log("Received Acknowledgement - no action needed");
        break;
      default:
        console.log("Unknown TradeXML message type, storing raw:", messageType);
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

/**
 * Detect TradeXML 2.1.19 message type from root element
 */
function detectMessageType(xml: string): string {
  if (xml.includes('<OrderPlacementReply')) return 'OrderPlacementReply';
  if (xml.includes('<PushOrderConfirmation')) return 'PushOrderConfirmation';
  if (xml.includes('<ShipmentNotification')) return 'ShipmentNotification';
  if (xml.includes('<ShippingNotification')) return 'ShippingNotification';
  if (xml.includes('<PushOrderStatus')) return 'PushOrderStatus';
  if (xml.includes('<OrderStatusReply')) return 'OrderStatusReply';
  if (xml.includes('<BillingDocument')) return 'BillingDocument';
  if (xml.includes('<PushProductList')) return 'PushProductList';
  if (xml.includes('<ProductListReply')) return 'PushProductList';
  if (xml.includes('<PushOrderChangeConfirmation')) return 'PushOrderChangeConfirmation';
  if (xml.includes('<OrderCancellationReply')) return 'OrderCancellationReply';
  if (xml.includes('<Acknowledgement')) return 'Acknowledgement';
  return 'Unknown';
}

/**
 * Find supplier order by PurchaseOrderNumber (our order ID)
 */
async function findSupplierOrder(supabase: any, xml: string) {
  const purchaseOrderMatch = xml.match(/<PurchaseOrderNumber>([^<]+)<\/PurchaseOrderNumber>/);
  if (!purchaseOrderMatch) {
    console.error("No PurchaseOrderNumber found in message");
    return null;
  }

  const purchaseOrderNumber = purchaseOrderMatch[1];

  // PurchaseOrderNumber is our supplier_order ID
  const { data, error } = await supabase
    .from("supplier_orders")
    .select("id, status")
    .eq("id", purchaseOrderNumber)
    .single();

  if (error || !data) {
    console.error(`Supplier order not found for PurchaseOrderNumber: ${purchaseOrderNumber}`);
    return null;
  }

  return data;
}

/**
 * Extract SalesDocumentNumber (supplier's own order reference)
 */
function extractSalesDocumentNumber(xml: string): string | null {
  const match = xml.match(/<SalesDocumentNumber>([^<]+)<\/SalesDocumentNumber>/);
  return match?.[1] || null;
}

/**
 * Extract confirmed delivery date from ConfirmationSchedule
 * TradeXML uses <ConfirmedDeliveryDate><Year>YYYY</Year><Month>MM</Month><Day>DD</Day></ConfirmedDeliveryDate>
 */
function extractConfirmedDeliveryDate(xml: string): string | null {
  const scheduleMatch = xml.match(/<ConfirmationSchedule>[\s\S]*?<\/ConfirmationSchedule>/);
  if (!scheduleMatch) return null;

  const block = scheduleMatch[0];
  const yearMatch = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Year>(\d+)<\/Year>/);
  const monthMatch = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Month>(\d+)<\/Month>/);
  const dayMatch = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Day>(\d+)<\/Day>/);

  if (yearMatch && monthMatch && dayMatch) {
    return `${yearMatch[1]}-${monthMatch[1].padStart(2, '0')}-${dayMatch[1].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Handle OrderPlacementReply - synchronous reply after placing an order
 * Contains SalesDocumentNumber and line-level confirmations
 */
async function handleOrderPlacementReply(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  const salesDocNumber = extractSalesDocumentNumber(xml);
  const deliveryDate = extractConfirmedDeliveryDate(xml);

  await supabase
    .from("supplier_orders")
    .update({
      status: 'confirmed',
      external_order_id: salesDocNumber || undefined,
      confirmed_at: new Date().toISOString(),
      expected_delivery_date: deliveryDate || undefined,
      xml_response: xml,
    })
    .eq("id", supplierOrder.id);

  console.log(`OrderPlacementReply processed: ${supplierOrder.id}, sales doc: ${salesDocNumber}`);
}

/**
 * Handle PushOrderConfirmation - async order confirmation pushed by supplier
 * Similar structure to OrderPlacementReply but arrives asynchronously
 */
async function handlePushOrderConfirmation(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  const salesDocNumber = extractSalesDocumentNumber(xml);
  const deliveryDate = extractConfirmedDeliveryDate(xml);

  await supabase
    .from("supplier_orders")
    .update({
      status: 'confirmed',
      external_order_id: salesDocNumber || undefined,
      confirmed_at: new Date().toISOString(),
      expected_delivery_date: deliveryDate || undefined,
      xml_response: xml,
    })
    .eq("id", supplierOrder.id);

  console.log(`PushOrderConfirmation processed: ${supplierOrder.id}, sales doc: ${salesDocNumber}`);
}

/**
 * Handle ShippingNotification / ShipmentNotification
 * TradeXML 2.1.17+ uses ShipmentNotification within ShippingNotifications
 * Contains tracking details and estimated delivery
 */
async function handleShippingNotification(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  // Extract tracking number from TradeXML structure
  const trackingMatch = xml.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
  
  // Extract estimated delivery date
  let estimatedDelivery: string | null = null;
  const estYearMatch = xml.match(/<EstimatedDeliveryDate>[\s\S]*?<Year>(\d+)<\/Year>/);
  const estMonthMatch = xml.match(/<EstimatedDeliveryDate>[\s\S]*?<Month>(\d+)<\/Month>/);
  const estDayMatch = xml.match(/<EstimatedDeliveryDate>[\s\S]*?<Day>(\d+)<\/Day>/);

  if (estYearMatch && estMonthMatch && estDayMatch) {
    estimatedDelivery = `${estYearMatch[1]}-${estMonthMatch[1].padStart(2, '0')}-${estDayMatch[1].padStart(2, '0')}`;
  }

  // Also try ConfirmedDeliveryDate as fallback
  if (!estimatedDelivery) {
    estimatedDelivery = extractConfirmedDeliveryDate(xml);
  }

  const notes = trackingMatch ? `Tracking: ${trackingMatch[1]}` : null;

  await supabase
    .from("supplier_orders")
    .update({
      status: 'shipped',
      expected_delivery_date: estimatedDelivery || undefined,
      notes,
      xml_response: xml,
    })
    .eq("id", supplierOrder.id);

  await supabase
    .from("supplier_order_lines")
    .update({ status: 'shipped' })
    .eq("supplier_order_id", supplierOrder.id);

  console.log(`ShippingNotification processed: ${supplierOrder.id}, tracking: ${trackingMatch?.[1] || 'none'}`);
}

/**
 * Handle PushOrderStatus / OrderStatusReply
 */
async function handleOrderStatusUpdate(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  // Extract any status info from LineStatus elements
  const errorTextMatch = xml.match(/<ErrorText>([^<]+)<\/ErrorText>/);
  const errorCodeMatch = xml.match(/<ErrorCode>([^<]+)<\/ErrorCode>/);

  if (errorTextMatch || errorCodeMatch) {
    console.log(`Order status update: ${supplierOrder.id}, error: ${errorCodeMatch?.[1]} - ${errorTextMatch?.[1]}`);
  } else {
    console.log(`Order status update received: ${supplierOrder.id}`);
  }
}

/**
 * Handle BillingDocument (invoices from supplier)
 */
async function handleBillingDocument(_supabase: any, xml: string) {
  const invoiceMatch = xml.match(/<InvoiceNumber>([^<]+)<\/InvoiceNumber>/);
  console.log(`BillingDocument received - invoice: ${invoiceMatch?.[1] || 'unknown'}, storing for processing`);
}

/**
 * Handle PushProductList (price list updates from supplier)
 */
async function handlePushProductList(_supabase: any, _xml: string) {
  console.log("PushProductList received - processing not yet implemented");
}

/**
 * Handle PushOrderChangeConfirmation (supplier confirms order modification)
 */
async function handleOrderChangeConfirmation(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  const deliveryDate = extractConfirmedDeliveryDate(xml);

  if (deliveryDate) {
    await supabase
      .from("supplier_orders")
      .update({
        expected_delivery_date: deliveryDate,
        xml_response: xml,
      })
      .eq("id", supplierOrder.id);
  }

  console.log(`OrderChangeConfirmation processed: ${supplierOrder.id}`);
}

/**
 * Handle OrderCancellationReply (supplier confirms or rejects cancellation)
 */
async function handleOrderCancellationReply(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  // Check if cancellation was accepted or rejected
  const errorCodeMatch = xml.match(/<ErrorCode>([^<]+)<\/ErrorCode>/);

  if (!errorCodeMatch) {
    // No error = cancellation accepted
    await supabase
      .from("supplier_orders")
      .update({
        status: 'cancelled',
        xml_response: xml,
      })
      .eq("id", supplierOrder.id);

    console.log(`OrderCancellationReply: cancellation accepted for ${supplierOrder.id}`);
  } else {
    console.log(`OrderCancellationReply: cancellation rejected for ${supplierOrder.id}, error: ${errorCodeMatch[1]}`);
  }
}
