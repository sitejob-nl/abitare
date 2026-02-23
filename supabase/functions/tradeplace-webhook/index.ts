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

    // Audit trail: log every inbound message
    const supplierOrderId = extractPurchaseOrderNumber(body);
    const supplierId = await findSupplierIdByGln(supabase, body);

    await supabase.from("tradeplace_messages").insert({
      message_type: messageType,
      direction: 'inbound',
      supplier_order_id: supplierOrderId || null,
      supplier_id: supplierId || null,
      raw_xml: body,
      metadata: { headers: Object.fromEntries(req.headers.entries()) },
    });

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
      case 'StockPush':
      case 'PushStockLevel':
        await handleStockPush(supabase, body);
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
        console.log("Unknown TradeXML message type, stored raw:", messageType);
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
  if (xml.includes('<OrderPlacementReply')) return 'OrderPlacementReply';
  if (xml.includes('<PushOrderConfirmation')) return 'PushOrderConfirmation';
  if (xml.includes('<ShipmentNotification')) return 'ShipmentNotification';
  if (xml.includes('<ShippingNotification')) return 'ShippingNotification';
  if (xml.includes('<PushOrderStatus')) return 'PushOrderStatus';
  if (xml.includes('<OrderStatusReply')) return 'OrderStatusReply';
  if (xml.includes('<BillingDocument')) return 'BillingDocument';
  if (xml.includes('<StockPush')) return 'StockPush';
  if (xml.includes('<PushStockLevel')) return 'PushStockLevel';
  if (xml.includes('<PushProductList')) return 'PushProductList';
  if (xml.includes('<ProductListReply')) return 'PushProductList';
  if (xml.includes('<PushOrderChangeConfirmation')) return 'PushOrderChangeConfirmation';
  if (xml.includes('<OrderCancellationReply')) return 'OrderCancellationReply';
  if (xml.includes('<Acknowledgement')) return 'Acknowledgement';
  return 'Unknown';
}

function extractPurchaseOrderNumber(xml: string): string | null {
  const match = xml.match(/<PurchaseOrderNumber>([^<]+)<\/PurchaseOrderNumber>/);
  return match?.[1] || null;
}

async function findSupplierIdByGln(supabase: any, xml: string): Promise<string | null> {
  const glnMatch = xml.match(/<SellerCode[^>]*>([^<]+)<\/SellerCode>/);
  if (!glnMatch) return null;

  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("tradeplace_gln", glnMatch[1])
    .single();

  return data?.id || null;
}

async function findSupplierOrder(supabase: any, xml: string) {
  const purchaseOrderMatch = xml.match(/<PurchaseOrderNumber>([^<]+)<\/PurchaseOrderNumber>/);
  if (!purchaseOrderMatch) {
    console.error("No PurchaseOrderNumber found in message");
    return null;
  }

  const { data, error } = await supabase
    .from("supplier_orders")
    .select("id, status")
    .eq("id", purchaseOrderMatch[1])
    .single();

  if (error || !data) {
    console.error(`Supplier order not found for PurchaseOrderNumber: ${purchaseOrderMatch[1]}`);
    return null;
  }

  return data;
}

function extractSalesDocumentNumber(xml: string): string | null {
  const match = xml.match(/<SalesDocumentNumber>([^<]+)<\/SalesDocumentNumber>/);
  return match?.[1] || null;
}

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

async function handleShippingNotification(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  const trackingMatch = xml.match(/<TrackingNumber>([^<]+)<\/TrackingNumber>/);
  
  let estimatedDelivery: string | null = null;
  const estYearMatch = xml.match(/<EstimatedDeliveryDate>[\s\S]*?<Year>(\d+)<\/Year>/);
  const estMonthMatch = xml.match(/<EstimatedDeliveryDate>[\s\S]*?<Month>(\d+)<\/Month>/);
  const estDayMatch = xml.match(/<EstimatedDeliveryDate>[\s\S]*?<Day>(\d+)<\/Day>/);

  if (estYearMatch && estMonthMatch && estDayMatch) {
    estimatedDelivery = `${estYearMatch[1]}-${estMonthMatch[1].padStart(2, '0')}-${estDayMatch[1].padStart(2, '0')}`;
  }

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

async function handleOrderStatusUpdate(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  // Extract line-level statuses
  const lineBlocks = xml.match(/<OrderStatusReplyLineItem>[\s\S]*?<\/OrderStatusReplyLineItem>/g) || [];
  
  for (const block of lineBlocks) {
    const eanMatch = block.match(/<Material[^>]*>([^<]+)<\/Material>/);
    const confirmedQtyMatch = block.match(/<ConfirmedQuantity>([^<]+)<\/ConfirmedQuantity>/);
    const backorderQtyMatch = block.match(/<BackorderLineQuantity>([^<]+)<\/BackorderLineQuantity>/);
    const rejectedQtyMatch = block.match(/<RejectedLineQuantity>([^<]+)<\/RejectedLineQuantity>/);
    const deliveredQtyMatch = block.match(/<DeliveredLineQuantity>([^<]+)<\/DeliveredLineQuantity>/);

    if (eanMatch) {
      const metadata: Record<string, any> = {};
      if (confirmedQtyMatch) metadata.confirmed_qty = parseFloat(confirmedQtyMatch[1]);
      if (backorderQtyMatch) metadata.backorder_qty = parseFloat(backorderQtyMatch[1]);
      if (rejectedQtyMatch) metadata.rejected_qty = parseFloat(rejectedQtyMatch[1]);
      if (deliveredQtyMatch) metadata.delivered_qty = parseFloat(deliveredQtyMatch[1]);

      // Determine line status
      let lineStatus = 'confirmed';
      if (deliveredQtyMatch && parseFloat(deliveredQtyMatch[1]) > 0) lineStatus = 'delivered';
      else if (rejectedQtyMatch && parseFloat(rejectedQtyMatch[1]) > 0) lineStatus = 'rejected';
      else if (backorderQtyMatch && parseFloat(backorderQtyMatch[1]) > 0) lineStatus = 'backorder';

      await supabase
        .from("supplier_order_lines")
        .update({ status: lineStatus, metadata })
        .eq("supplier_order_id", supplierOrder.id)
        .eq("ean_code", eanMatch[1]);
    }
  }

  // Update delivery date if present
  const deliveryDate = extractConfirmedDeliveryDate(xml);
  if (deliveryDate) {
    await supabase
      .from("supplier_orders")
      .update({ expected_delivery_date: deliveryDate, xml_response: xml })
      .eq("id", supplierOrder.id);
  }

  console.log(`OrderStatus update processed: ${supplierOrder.id}`);
}

async function handleBillingDocument(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  
  const invoiceNumberMatch = xml.match(/<InvoiceNumber>([^<]+)<\/InvoiceNumber>/);
  const invoiceNumber = invoiceNumberMatch?.[1] || null;

  // Extract invoice amount from MonetaryAmount
  let invoiceAmount: number | null = null;
  const amountMatch = xml.match(/<TotalAmount>([^<]+)<\/TotalAmount>/) ||
    xml.match(/<MonetaryAmount[^>]*>[\s\S]*?<Amount>([^<]+)<\/Amount>/);
  if (amountMatch) {
    invoiceAmount = parseFloat(amountMatch[1]);
  }

  // Extract invoice date
  let invoiceDate: string | null = null;
  const invDateMatch = xml.match(/<InvoiceDate>[\s\S]*?<Year>(\d+)<\/Year>[\s\S]*?<Month>(\d+)<\/Month>[\s\S]*?<Day>(\d+)<\/Day>/);
  if (invDateMatch) {
    invoiceDate = `${invDateMatch[1]}-${invDateMatch[2].padStart(2, '0')}-${invDateMatch[3].padStart(2, '0')}`;
  }

  if (supplierOrder && (invoiceNumber || invoiceAmount || invoiceDate)) {
    await supabase
      .from("supplier_orders")
      .update({
        invoice_number: invoiceNumber,
        invoice_amount: invoiceAmount,
        invoice_date: invoiceDate,
        xml_response: xml,
      })
      .eq("id", supplierOrder.id);
  }

  console.log(`BillingDocument processed: invoice ${invoiceNumber}, amount ${invoiceAmount}, date ${invoiceDate}`);
}

async function handleStockPush(supabase: any, xml: string) {
  // Parse stock level items
  const itemBlocks = xml.match(/<StockLevelLineItem>[\s\S]*?<\/StockLevelLineItem>/g) ||
    xml.match(/<PushStockLevelLineItem>[\s\S]*?<\/PushStockLevelLineItem>/g) || [];

  let updated = 0;
  for (const block of itemBlocks) {
    const eanMatch = block.match(/<Material[^>]*>([^<]+)<\/Material>/);
    const qtyMatch = block.match(/<AvailableQuantity>([^<]+)<\/AvailableQuantity>/) ||
      block.match(/<StockQuantity>([^<]+)<\/StockQuantity>/);

    if (eanMatch) {
      const stockData = {
        ean: eanMatch[1],
        available_qty: qtyMatch ? parseFloat(qtyMatch[1]) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("products")
        .update({ tradeplace_stock: stockData })
        .eq("ean_code", eanMatch[1]);

      if (!error) updated++;
    }
  }

  console.log(`StockPush processed: ${updated} products updated out of ${itemBlocks.length} items`);
}

async function handlePushProductList(_supabase: any, _xml: string) {
  console.log("PushProductList received - stored in audit trail");
}

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

async function handleOrderCancellationReply(supabase: any, xml: string) {
  const supplierOrder = await findSupplierOrder(supabase, xml);
  if (!supplierOrder) return;

  const errorCodeMatch = xml.match(/<ErrorCode>([^<]+)<\/ErrorCode>/);

  if (!errorCodeMatch) {
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
