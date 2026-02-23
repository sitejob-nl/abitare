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

    const { supplier_order_id } = await req.json();
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

    const supplier = supplierOrder.supplier;
    if (!supplier?.tradeplace_enabled || !supplier?.tradeplace_gln || !supplier?.tradeplace_tp_id) {
      return new Response(JSON.stringify({ error: "supplier_not_configured", message: `${supplier?.name} is niet gekoppeld aan Tradeplace` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE OrderStatusRequest SYSTEM "TradeXML.dtd">
<OrderStatusRequest>
  <OrderStatusRequestHeader>
    <MessageType>OrderStatusRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">${escapeXml(retailerGln)}</CustomerCode>
    <SellerCode>${escapeXml(supplier.tradeplace_gln)}</SellerCode>
    <PurchaseOrderNumber>${escapeXml(supplier_order_id)}</PurchaseOrderNumber>
  </OrderStatusRequestHeader>
</OrderStatusRequest>`;

    // Log outbound message
    await supabase.from("tradeplace_messages").insert({
      message_type: 'OrderStatusRequest',
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
      message_type: 'OrderStatusReply',
      direction: 'inbound',
      supplier_order_id,
      supplier_id: supplier.id,
      raw_xml: responseText,
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false, error: "tmh2_error",
        message: `TMH2 fout (${response.status}): kon status niet ophalen`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse OrderStatusReply
    const result = parseOrderStatusReply(responseText);

    // Update supplier order with latest info
    const updateData: Record<string, any> = { xml_response: responseText };
    if (result.delivery_date) updateData.expected_delivery_date = result.delivery_date;
    if (result.sales_document_number) updateData.external_order_id = result.sales_document_number;

    await supabase.from("supplier_orders").update(updateData).eq("id", supplier_order_id);

    // Update line statuses if available
    for (const line of result.lines) {
      if (line.ean_code) {
        await supabase
          .from("supplier_order_lines")
          .update({ status: line.status, metadata: line.metadata })
          .eq("supplier_order_id", supplier_order_id)
          .eq("ean_code", line.ean_code);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ...result,
      message: "Orderstatus opgehaald",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Tradeplace order-status error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

interface LineStatus {
  ean_code: string;
  status: string;
  confirmed_qty: number | null;
  backorder_qty: number | null;
  rejected_qty: number | null;
  delivered_qty: number | null;
  metadata: Record<string, any>;
}

function parseOrderStatusReply(xml: string) {
  const salesDocMatch = xml.match(/<SalesDocumentNumber>([^<]+)<\/SalesDocumentNumber>/);

  // Delivery date
  let delivery_date: string | null = null;
  const scheduleMatch = xml.match(/<ConfirmationSchedule>[\s\S]*?<\/ConfirmationSchedule>/);
  if (scheduleMatch) {
    const block = scheduleMatch[0];
    const y = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Year>(\d+)<\/Year>/);
    const m = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Month>(\d+)<\/Month>/);
    const d = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Day>(\d+)<\/Day>/);
    if (y && m && d) delivery_date = `${y[1]}-${m[1].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
  }

  // Line statuses
  const lineBlocks = xml.match(/<OrderStatusReplyLineItem>[\s\S]*?<\/OrderStatusReplyLineItem>/g) || [];
  const lines: LineStatus[] = lineBlocks.map(block => {
    const eanMatch = block.match(/<Material[^>]*>([^<]+)<\/Material>/);
    const confirmedQty = block.match(/<ConfirmedQuantity>([^<]+)<\/ConfirmedQuantity>/);
    const backorderQty = block.match(/<BackorderLineQuantity>([^<]+)<\/BackorderLineQuantity>/);
    const rejectedQty = block.match(/<RejectedLineQuantity>([^<]+)<\/RejectedLineQuantity>/);
    const deliveredQty = block.match(/<DeliveredLineQuantity>([^<]+)<\/DeliveredLineQuantity>/);

    const confirmed = confirmedQty ? parseFloat(confirmedQty[1]) : null;
    const backorder = backorderQty ? parseFloat(backorderQty[1]) : null;
    const rejected = rejectedQty ? parseFloat(rejectedQty[1]) : null;
    const delivered = deliveredQty ? parseFloat(deliveredQty[1]) : null;

    let status = 'confirmed';
    if (delivered && delivered > 0) status = 'delivered';
    else if (rejected && rejected > 0) status = 'rejected';
    else if (backorder && backorder > 0) status = 'backorder';

    return {
      ean_code: eanMatch?.[1] || '',
      status,
      confirmed_qty: confirmed,
      backorder_qty: backorder,
      rejected_qty: rejected,
      delivered_qty: delivered,
      metadata: { confirmed_qty: confirmed, backorder_qty: backorder, rejected_qty: rejected, delivered_qty: delivered },
    };
  });

  return {
    sales_document_number: salesDocMatch?.[1] || null,
    delivery_date,
    lines,
  };
}
