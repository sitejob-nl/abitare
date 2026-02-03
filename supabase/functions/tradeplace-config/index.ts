import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    // Check if secrets are configured
    const apiKey = Deno.env.get("TRADEPLACE_API_KEY");
    const retailerGln = Deno.env.get("TRADEPLACE_RETAILER_GLN");

    const missing: string[] = [];
    if (!apiKey) missing.push("TRADEPLACE_API_KEY");
    if (!retailerGln) missing.push("TRADEPLACE_RETAILER_GLN");

    const configured = missing.length === 0;

    if (action === "check") {
      return new Response(JSON.stringify({
        configured,
        retailer_gln: configured ? retailerGln : null,
        missing_secrets: missing,
        message: configured 
          ? "Tradeplace is geconfigureerd en actief" 
          : "Configureer de Tradeplace secrets in Supabase Dashboard"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "test") {
      if (!configured) {
        return new Response(JSON.stringify({
          success: false,
          error: "not_configured",
          message: "Tradeplace is nog niet geconfigureerd. Voeg eerst de benodigde secrets toe.",
          missing_secrets: missing
        }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // TODO: When Tradeplace API details are known, implement actual connection test
      // For now, return success if secrets are configured
      return new Response(JSON.stringify({
        success: true,
        message: "Tradeplace configuratie is compleet. Verbindingstest wordt beschikbaar na ontvangst API documentatie.",
        retailer_gln: retailerGln
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      error: "invalid_action",
      message: "Ongeldige actie. Gebruik 'check' of 'test'."
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Tradeplace config error:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      message: error instanceof Error ? error.message : "Er is een fout opgetreden"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
