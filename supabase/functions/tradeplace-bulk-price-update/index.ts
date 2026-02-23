import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 50;

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
        net_price = amount;
      }
    }

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

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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

    const { supplier_id } = await req.json() as { supplier_id: string };

    if (!supplier_id) {
      return new Response(JSON.stringify({ error: "invalid_request", message: "supplier_id is verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get supplier
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

    // Fetch all active products with EAN for this supplier
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, ean_code")
      .eq("supplier_id", supplier_id)
      .eq("is_active", true)
      .not("ean_code", "is", null);

    if (productsError) {
      return new Response(JSON.stringify({ error: "db_error", message: "Fout bij ophalen producten" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Filter out empty EAN codes
    const validProducts = (products || []).filter(p => p.ean_code && p.ean_code.trim() !== '');

    if (validProducts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        supplier_name: supplier.name,
        total_products: 0,
        batches_sent: 0,
        updated: 0,
        not_found: 0,
        errors: 0,
        message: "Geen producten met EAN-code gevonden voor deze leverancier"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build EAN -> product ID map
    const eanToIds = new Map<string, string[]>();
    for (const p of validProducts) {
      const ean = p.ean_code!.trim();
      if (!eanToIds.has(ean)) eanToIds.set(ean, []);
      eanToIds.get(ean)!.push(p.id);
    }

    const uniqueEans = Array.from(eanToIds.keys());
    const batches = chunk(uniqueEans, BATCH_SIZE);

    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/messages/tp/${encodeURIComponent(supplier.tradeplace_tp_id)}`;

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const batch of batches) {
      try {
        const lineItems = batch.map((ean, i) => `      <ProductPriceRequestLineItem>
        <LineItemNumber>${i + 1}</LineItemNumber>
        <Material materialQualifier="EAN">${escapeXml(ean)}</Material>
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
          message_type: 'BulkProductPriceRequest',
          direction: 'outbound',
          supplier_id: supplier.id,
          raw_xml: xmlRequest,
          metadata: { batch_size: batch.length, total_eans: uniqueEans.length },
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Authorization": getAuthHeader(), "Content-Type": "application/xml" },
          body: xmlRequest,
        });

        const responseText = await response.text();

        // Log inbound
        await supabase.from("tradeplace_messages").insert({
          message_type: 'BulkProductPriceReply',
          direction: 'inbound',
          supplier_id: supplier.id,
          raw_xml: responseText,
        });

        if (!response.ok) {
          console.error(`TMH2 batch error (${response.status}):`, responseText.substring(0, 500));
          errors += batch.length;
          continue;
        }

        const results = parseProductPriceReply(responseText);

        // Update cost_price for each result
        for (const result of results) {
          if (!result.ean_code || result.net_price === null) {
            notFound++;
            continue;
          }

          const productIds = eanToIds.get(result.ean_code);
          if (!productIds || productIds.length === 0) {
            notFound++;
            continue;
          }

          const { error: updateError } = await supabase
            .from("products")
            .update({ cost_price: result.net_price })
            .in("id", productIds);

          if (updateError) {
            console.error(`Update error for EAN ${result.ean_code}:`, updateError);
            errors++;
          } else {
            updated += productIds.length;
          }
        }

        // Count EANs in batch that had no result
        const returnedEans = new Set(results.map(r => r.ean_code));
        for (const ean of batch) {
          if (!returnedEans.has(ean)) notFound++;
        }

      } catch (batchError) {
        console.error("Batch processing error:", batchError);
        errors += batch.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      supplier_name: supplier.name,
      total_products: validProducts.length,
      unique_eans: uniqueEans.length,
      batches_sent: batches.length,
      updated,
      not_found: notFound,
      errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Tradeplace bulk-price-update error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
