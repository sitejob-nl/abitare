import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const secret = req.headers.get("X-Webhook-Secret");
  if (secret !== Deno.env.get("WHATSAPP_WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const config = await req.json();

  if (config.action === "disconnect") {
    await supabase.from("whatsapp_config").delete().neq("id", "");
    return new Response(JSON.stringify({ ok: true, disconnected: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error } = await supabase
    .from("whatsapp_config")
    .upsert(
      {
        id: "00000000-0000-0000-0000-000000000001",
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
        display_phone: config.display_phone,
        waba_id: config.waba_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
