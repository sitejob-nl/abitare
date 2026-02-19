import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("06")) cleaned = "316" + cleaned.slice(2);
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { to, message, type = "text", template, customer_id, order_id, ticket_id } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: "Telefoonnummer is vereist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for config + logging
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: max 20 messages per user per minute
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount } = await supabase
      .from("communication_log")
      .select("id", { count: "exact", head: true })
      .eq("sent_by", userId)
      .eq("type", "whatsapp")
      .eq("direction", "outbound")
      .gte("sent_at", oneMinuteAgo);

    if ((recentCount ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Rate limit bereikt. Probeer het over een minuut opnieuw." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get WhatsApp config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "WhatsApp is niet gekoppeld. Configureer eerst de koppeling in Instellingen." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedTo = normalizePhone(to);

    // Build Meta API request body
    const metaBody: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: normalizedTo,
    };

    if (type === "template" && template) {
      metaBody.type = "template";
      metaBody.template = template;
    } else {
      metaBody.type = "text";
      metaBody.text = { body: message || "" };
    }

    // Send via Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaBody),
      }
    );

    const result = await metaRes.json();

    if (!metaRes.ok) {
      console.error("Meta API error:", result);
      return new Response(JSON.stringify({ error: "Bericht kon niet worden verstuurd", details: result }), {
        status: metaRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wamid = result.messages?.[0]?.id || null;

    // Log in communication_log
    const bodyPreview = type === "template"
      ? `Template: ${template?.name || "onbekend"}`
      : (message || "").substring(0, 500);

    const { error: insertError } = await supabase
      .from("communication_log")
      .insert({
        type: "whatsapp",
        direction: "outbound",
        subject: `WhatsApp aan ${normalizedTo}`,
        body_preview: bodyPreview,
        customer_id: customer_id || null,
        order_id: order_id || null,
        ticket_id: ticket_id || null,
        sent_at: new Date().toISOString(),
        sent_by: userId,
        external_message_id: wamid,
        metadata: {
          to_number: normalizedTo,
          message_type: type,
          template_name: type === "template" ? template?.name : undefined,
          status: "sent",
        },
      });

    if (insertError) {
      console.error("Error logging message:", insertError);
    }

    console.log(`WhatsApp sent to ${normalizedTo} by ${userId}, wamid: ${wamid}`);

    return new Response(JSON.stringify({ ok: true, wamid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send error:", err);
    return new Response(JSON.stringify({ error: "Er is een fout opgetreden" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
