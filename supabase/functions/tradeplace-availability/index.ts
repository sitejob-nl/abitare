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

    // Build TradeXML 2.0 ProductAvailabilityRequest
    const xmlRequest = buildAvailabilityRequest(retailerGln, supplier.tradeplace_gln, products);

    // Send to TMH2
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/messages/tp/${encodeURIComponent(tpId)}`;

    console.log(`Sending availability request to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(),
        "Content-Type": "application/xml",
      },
      body: xmlRequest,
    });

    const responseText = await response.text();
    console.log(`TMH2 response status: ${response.status}`);

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

    // Parse XML response
    const results = parseAvailabilityResponse(responseText, products);

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

function buildAvailabilityRequest(
  senderGln: string, 
  receiverGln: string, 
  products: ProductRequest[]
): string {
  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const productLines = products.map(p => `
    <Product>
      <EAN>${escapeXml(p.ean_code)}</EAN>
      <Quantity>${p.quantity}</Quantity>
    </Product>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ProductAvailabilityRequest xmlns="http://www.tradeplace.com/schema/pi">
  <Header>
    <MessageID>${messageId}</MessageID>
    <Timestamp>${timestamp}</Timestamp>
    <SenderGLN>${escapeXml(senderGln)}</SenderGLN>
    <ReceiverGLN>${escapeXml(receiverGln)}</ReceiverGLN>
  </Header>
  <Products>${productLines}
  </Products>
</ProductAvailabilityRequest>`;
}

function parseAvailabilityResponse(xml: string, products: ProductRequest[]): AvailabilityResult[] {
  // Parse the XML response from TMH2
  // TradeXML responses contain <ProductAvailabilityReply> with product availability info
  return products.map(product => {
    // Try to find availability info for this EAN in the XML
    const eanPattern = new RegExp(`<EAN>${escapeRegex(product.ean_code)}</EAN>[\\s\\S]*?<\\/Product>`, 'i');
    const match = xml.match(eanPattern);

    if (!match) {
      return {
        ean_code: product.ean_code,
        available: false,
        quantity_available: null,
        lead_time_days: null,
        status: 'unknown' as const,
        message: "Geen beschikbaarheidsinformatie ontvangen",
      };
    }

    const block = match[0];
    const qtyMatch = block.match(/<AvailableQuantity>(\d+)<\/AvailableQuantity>/i);
    const leadTimeMatch = block.match(/<LeadTimeDays>(\d+)<\/LeadTimeDays>/i);
    const statusMatch = block.match(/<AvailabilityStatus>([^<]+)<\/AvailabilityStatus>/i);

    const qtyAvailable = qtyMatch ? parseInt(qtyMatch[1]) : null;
    const leadTime = leadTimeMatch ? parseInt(leadTimeMatch[1]) : null;
    const rawStatus = statusMatch?.[1]?.toLowerCase() || '';

    let status: AvailabilityResult['status'] = 'unknown';
    if (rawStatus.includes('in_stock') || rawStatus.includes('available')) status = 'in_stock';
    else if (rawStatus.includes('limited')) status = 'limited';
    else if (rawStatus.includes('out_of_stock') || rawStatus.includes('unavailable')) status = 'out_of_stock';
    else if (rawStatus.includes('backorder')) status = 'backorder';

    return {
      ean_code: product.ean_code,
      available: status === 'in_stock' || status === 'limited' || (qtyAvailable !== null && qtyAvailable > 0),
      quantity_available: qtyAvailable,
      lead_time_days: leadTime,
      status,
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
