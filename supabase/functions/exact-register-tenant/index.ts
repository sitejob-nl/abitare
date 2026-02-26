import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { encryptToken } from "../_shared/crypto.ts";

const CONNECT_REGISTER_URL = "https://xeshjkznwdrxjjhbpisn.supabase.co/functions/v1/exact-register-tenant";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const connectApiKey = Deno.env.get("CONNECT_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    if (!connectApiKey) {
      throw new Error("CONNECT_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { divisionId } = await req.json();

    if (!divisionId) {
      throw new Error("divisionId is required");
    }

    // Check if this division already has a tenant_id
    const { data: existingConn } = await supabase
      .from("exact_online_connections")
      .select("id, tenant_id")
      .eq("division_id", divisionId)
      .single();

    if (existingConn?.tenant_id) {
      return new Response(JSON.stringify({ 
        tenant_id: existingConn.tenant_id,
        already_registered: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Register tenant at SiteJob Connect
    const webhookUrl = `${supabaseUrl}/functions/v1/exact-webhook`;

    const registerRes = await fetch(CONNECT_REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": connectApiKey,
      },
      body: JSON.stringify({
        name: "Abitare",
        webhook_url: webhookUrl,
        region: "nl",
      }),
    });

    if (!registerRes.ok) {
      const errText = await registerRes.text();
      throw new Error(`Failed to register tenant: ${errText}`);
    }

    const { tenant_id, webhook_secret } = await registerRes.json();

    // Encrypt webhook_secret before storing
    const encryptedSecret = await encryptToken(webhook_secret);

    // Upsert connection record
    if (existingConn) {
      await supabase
        .from("exact_online_connections")
        .update({
          tenant_id,
          webhook_secret: encryptedSecret,
        })
        .eq("id", existingConn.id);
    } else {
      await supabase
        .from("exact_online_connections")
        .insert({
          division_id: divisionId,
          tenant_id,
          webhook_secret: encryptedSecret,
          is_active: false,
        });
    }

    return new Response(JSON.stringify({ tenant_id, success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Register tenant error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
