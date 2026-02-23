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

    const { supplier_id, products } = await req.json() as {
      supplier_id: string;
      products: { ean_code: string }[];
    };

    if (!supplier_id || !products || products.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_request", message: "supplier_id en products zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
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
      return new Response(JSON.stringify({ error: "supplier_not_found", message: "Leverancier niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!supplier.tradeplace_enabled || !supplier.tradeplace_gln || !supplier.tradeplace_tp_id) {
      return new Response(JSON.stringify({ error: "supplier_not_configured", message: `${supplier.name} is niet gekoppeld aan Tradeplace` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const lineItems = products.map((p, i) => `      <ProductPriceRequestLineItem>
        <LineItemNumber>${i + 1}</LineItemNumber>
        <Material materialQualifier="EAN">${escapeXml(p.ean_code)}</Material>
      </ProductPriceRequestLineItem>`).join('\n');

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ProductPriceRequest SYSTEM "TradeXML.dtd">
<ProductPriceRequest>
  <ProductPriceRequestHeader>
    <MessageType>ProductPriceRequest</MessageType>
    <CustomerCode customerCodeQualifier="GLN">${escapeXml(retailerGln)}</CustomerCode>
    <SellerCode>${escapeXml(supplier.tradeplace_gln)}</SellerCode>
  </ProductPriceRequestHeader>
  <ProductPriceRequestLineItems>
${lineItems}
  </ProductPriceRequestLineItems>
</ProductPriceRequest>`;

    // Log outbound
    await supabase.from("tradeplace_messages").insert({
      message_type: 'ProductPriceRequest',
      direction: 'outbound',
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

    // Log inbound
    await supabase.from("tradeplace_messages").insert({
      message_type: 'ProductPriceReply',
      direction: 'inbound',
      supplier_id: supplier.id,
      raw_xml: responseText,
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false, error: "tmh2_error",
        message: `TMH2 fout (${response.status}): prijzen niet opgehaald`,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse ProductPriceReply
    const results = parseProductPriceReply(responseText);

    return new Response(JSON.stringify({
      success: true,
      supplier_name: supplier.name,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Tradeplace product-price error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

interface PriceResult {
  ean_code: string;
  net_price: number | null;
  gross_price: number | null;
  recommended_price: number | null;
  currency: string;
  message?: string;
}

function parseProductPriceReply(xml: string): PriceResult[] {
  const lineBlocks = xml.match(/<ProductPriceReplyLineItem>[\s\S]*?<\/ProductPriceReplyLineItem>/g) || [];

  return lineBlocks.map(block => {
    const eanMatch = block.match(/<Material[^>]*>([^<]+)<\/Material>/);

    // Parse MonetaryAmounts - multiple price types possible
    const monetaryBlocks = block.match(/<MonetaryAmount[\s\S]*?<\/MonetaryAmount>/g) || [];

    let net_price: number | null = null;
    let gross_price: number | null = null;
    let recommended_price: number | null = null;
    let currency = 'EUR';

    for (const mb of monetaryBlocks) {
      const typeMatch = mb.match(/monetaryAmountQualifier="([^"]+)"/);
      const amountMatch = mb.match(/<Amount>([^<]+)<\/Amount>/);
      const currencyMatch = mb.match(/<Currency>([^<]+)<\/Currency>/);

      if (currencyMatch) currency = currencyMatch[1];
      const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
      const type = typeMatch?.[1]?.toLowerCase() || '';

      if (type.includes('net') || type.includes('netto') || type === 'net') {
        net_price = amount;
      } else if (type.includes('gross') || type.includes('bruto') || type === 'gross') {
        gross_price = amount;
      } else if (type.includes('recommend') || type.includes('advies') || type === 'rrp') {
        recommended_price = amount;
      } else if (!net_price) {
        // Default first amount to net price
        net_price = amount;
      }
    }

    // Fallback: single price element
    if (!net_price && !gross_price) {
      const simplePriceMatch = block.match(/<Price>([^<]+)<\/Price>/);
      if (simplePriceMatch) net_price = parseFloat(simplePriceMatch[1]);
    }

    const errorMatch = block.match(/<ErrorText>([^<]+)<\/ErrorText>/);

    return {
      ean_code: eanMatch?.[1] || '',
      net_price,
      gross_price,
      recommended_price,
      currency,
      message: errorMatch?.[1] || undefined,
    };
  });
}
