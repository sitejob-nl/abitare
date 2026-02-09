import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    const username = Deno.env.get("TRADEPLACE_USERNAME");
    const password = Deno.env.get("TRADEPLACE_PASSWORD");
    const retailerGln = Deno.env.get("TRADEPLACE_RETAILER_GLN");
    const environment = Deno.env.get("TRADEPLACE_ENVIRONMENT") || "test";

    const missing: string[] = [];
    if (!username) missing.push("TRADEPLACE_USERNAME");
    if (!password) missing.push("TRADEPLACE_PASSWORD");
    if (!retailerGln) missing.push("TRADEPLACE_RETAILER_GLN");

    const configured = missing.length === 0;

    const baseUrl = environment === "live"
      ? "https://hub-api.tradeplace.com/hub"
      : "https://qhub-api.tradeplace.com/hub";

    if (action === "check") {
      return new Response(JSON.stringify({
        configured,
        retailer_gln: configured ? retailerGln : null,
        environment: configured ? environment : null,
        base_url: configured ? baseUrl : null,
        missing_secrets: missing,
        message: configured 
          ? `Tradeplace TMH2 is geconfigureerd (${environment.toUpperCase()})` 
          : "Configureer de TMH2 secrets via Lovable"
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

      // Test connection by making a simple request to TMH2
      try {
        const authHeader = "Basic " + btoa(`${username}:${password}`);
        const testUrl = `${baseUrl}/api/status`;
        
        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Authorization": authHeader,
          },
        });

        if (response.status === 401 || response.status === 403) {
          return new Response(JSON.stringify({
            success: false,
            message: "Authenticatie mislukt. Controleer username en password.",
            environment,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Verbinding met TMH2 ${environment.toUpperCase()} succesvol`,
          environment,
          retailer_gln: retailerGln,
          base_url: baseUrl,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (fetchError) {
        return new Response(JSON.stringify({
          success: false,
          message: `Kan TMH2 niet bereiken: ${fetchError instanceof Error ? fetchError.message : "Onbekende fout"}`,
          environment,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
