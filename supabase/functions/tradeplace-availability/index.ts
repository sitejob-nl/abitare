import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProductRequest {
  ean_code: string;
  quantity: number;
}

interface AvailabilityResult {
  ean_code: string;
  available: boolean;
  quantity_available: number | null;
  lead_time_days: number | null;
  status: 'in_stock' | 'limited' | 'out_of_stock' | 'backorder' | 'unknown';
  message?: string;
}

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

    const { supplier_id, products } = await req.json() as {
      supplier_id: string;
      products: ProductRequest[];
    };

    if (!supplier_id || !products || products.length === 0) {
      return new Response(JSON.stringify({
        error: "invalid_request",
        message: "supplier_id en products zijn verplicht"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplier_id)
      .single();

    if (supplierError || !supplier) {
      return new Response(JSON.stringify({
        error: "supplier_not_found",
        message: "Leverancier niet gevonden"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!supplier.tradeplace_enabled || !supplier.tradeplace_gln) {
      return new Response(JSON.stringify({
        error: "supplier_not_configured",
        message: `${supplier.name} is niet gekoppeld aan Tradeplace. Configureer de GLN in leveranciersinstellingen.`
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

    // Build TradeXML 2.1.19 ProductAvailabilityRequest
    const xmlRequest = buildProductAvailabilityRequest(retailerGln, supplier.tradeplace_gln, products);

    // Send to TMH2
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/messages/tp/${encodeURIComponent(tpId)}`;

    console.log(`Sending ProductAvailabilityRequest to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(),
        "Content-Type": "application/xml",
      },
      body: xmlRequest,
    });

    const responseText = await response.text();
    console.log(`TMH2 availability response status: ${response.status}`);

    if (!response.ok) {
      console.error("TMH2 error response:", responseText);
      return new Response(JSON.stringify({
        success: false,
        error: "tmh2_error",
        message: `TMH2 fout (${response.status}): ${responseText.substring(0, 200)}`,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse TradeXML 2.1.19 ProductAvailabilityReply
    const results = parseProductAvailabilityReply(responseText, products);

    return new Response(JSON.stringify({
      success: true,
      supplier_name: supplier.name,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Tradeplace availability error:", error);
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
 * Build a TradeXML 2.1.19 compliant ProductAvailabilityRequest
 */
function buildProductAvailabilityRequest(
  customerGln: string,
  sellerGln: string,
  products: ProductRequest[]
): string {
  const lineItems = products.map((p, index) => `      <ProductAvailabilityRequestLineItem>
        <LineItemNumber>${index + 1}</LineItemNumber>
        <Material materialQualifier="EAN">${escapeXml(p.ean_code)}</Material>
        <QuantityRequested>${p.quantity}</QuantityRequested>
      </ProductAvailabilityRequestLineItem>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ProductAvailabilityRequest SYSTEM "TradeXML.dtd">
<ProductAvailabilityRequest>
  <ProductAvailabilityRequestHeader>
    <MessageType>ProductAvailabilityRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">${escapeXml(customerGln)}</CustomerCode>
    <SellerCode>${escapeXml(sellerGln)}</SellerCode>
  </ProductAvailabilityRequestHeader>
  <ProductAvailabilityRequestLineItems>
${lineItems}
  </ProductAvailabilityRequestLineItems>
</ProductAvailabilityRequest>`;
}

/**
 * Parse a TradeXML 2.1.19 ProductAvailabilityReply response.
 * 
 * Each <ProductAvailabilityReplyLineItem> contains:
 * - <Material materialQualifier="EAN">...</Material>
 * - <QuantityRequested>...</QuantityRequested>
 * - <ConfirmedQuantity>...</ConfirmedQuantity>
 * - <ConfirmationSchedule> with <ConfirmedDeliveryDate>
 * - <LineStatus> with <ErrorType>, <ErrorCode>, <ErrorText>
 * - <SalesUnit>...</SalesUnit>
 */
function parseProductAvailabilityReply(xml: string, products: ProductRequest[]): AvailabilityResult[] {
  // Split reply into individual line items
  const lineItemBlocks = xml.match(/<ProductAvailabilityReplyLineItem>[\s\S]*?<\/ProductAvailabilityReplyLineItem>/g) || [];

  // Build a map of EAN -> parsed data from the reply
  const replyMap = new Map<string, {
    confirmedQty: number | null;
    leadTimeDays: number | null;
    errorCode: string | null;
    errorText: string | null;
  }>();

  for (const block of lineItemBlocks) {
    const eanMatch = block.match(/<Material[^>]*>([^<]+)<\/Material>/);
    const confirmedQtyMatch = block.match(/<ConfirmedQuantity>([^<]+)<\/ConfirmedQuantity>/);
    const errorCodeMatch = block.match(/<ErrorCode>([^<]+)<\/ErrorCode>/);
    const errorTextMatch = block.match(/<ErrorText>([^<]+)<\/ErrorText>/);

    // Parse confirmed delivery date to estimate lead time
    let leadTimeDays: number | null = null;
    const yearMatch = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Year>(\d+)<\/Year>/);
    const monthMatch = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Month>(\d+)<\/Month>/);
    const dayMatch = block.match(/<ConfirmedDeliveryDate>[\s\S]*?<Day>(\d+)<\/Day>/);

    if (yearMatch && monthMatch && dayMatch) {
      const deliveryDate = new Date(
        parseInt(yearMatch[1]),
        parseInt(monthMatch[1]) - 1,
        parseInt(dayMatch[1])
      );
      const now = new Date();
      leadTimeDays = Math.max(0, Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    if (eanMatch) {
      replyMap.set(eanMatch[1], {
        confirmedQty: confirmedQtyMatch ? parseFloat(confirmedQtyMatch[1]) : null,
        leadTimeDays,
        errorCode: errorCodeMatch?.[1] || null,
        errorText: errorTextMatch?.[1] || null,
      });
    }
  }

  return products.map(product => {
    const reply = replyMap.get(product.ean_code);

    if (!reply) {
      return {
        ean_code: product.ean_code,
        available: false,
        quantity_available: null,
        lead_time_days: null,
        status: 'unknown' as const,
        message: "Geen beschikbaarheidsinformatie ontvangen",
      };
    }

    // Determine status based on confirmed quantity and error codes
    let status: AvailabilityResult['status'] = 'unknown';
    const confirmedQty = reply.confirmedQty;

    if (reply.errorCode) {
      // Error codes indicate issues
      status = 'out_of_stock';
    } else if (confirmedQty !== null) {
      if (confirmedQty >= product.quantity) {
        status = 'in_stock';
      } else if (confirmedQty > 0) {
        status = 'limited';
      } else {
        status = reply.leadTimeDays !== null ? 'backorder' : 'out_of_stock';
      }
    }

    return {
      ean_code: product.ean_code,
      available: status === 'in_stock' || status === 'limited',
      quantity_available: confirmedQty,
      lead_time_days: reply.leadTimeDays,
      status,
      message: reply.errorText || undefined,
    };
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
