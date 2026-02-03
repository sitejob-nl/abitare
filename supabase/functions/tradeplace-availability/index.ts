import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get supplier details
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

    // TODO: Implement actual Tradeplace API call when documentation is available
    // For now, return mock data to demonstrate the flow
    
    // Build XML request (for future implementation)
    const xmlRequest = buildAvailabilityRequest(retailerGln, supplier.tradeplace_gln, products);
    console.log("Would send XML request:", xmlRequest);

    // Mock response - in production this would come from Tradeplace API
    const results: AvailabilityResult[] = products.map(product => ({
      ean_code: product.ean_code,
      available: true,
      quantity_available: null,
      lead_time_days: null,
      status: 'unknown' as const,
      message: "Live beschikbaarheid wordt actief na ontvangst Tradeplace API documentatie"
    }));

    return new Response(JSON.stringify({
      success: true,
      supplier_name: supplier.name,
      results,
      note: "Demo modus - live data beschikbaar na Tradeplace account activatie"
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
