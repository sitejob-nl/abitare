import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Receives forwarded webhooks from SiteJob Connect.
 * Connect verifies the HMAC from Exact Online and forwards the Content node
 * with the tenant's webhook_secret in the X-Webhook-Secret header.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response("Configuration error", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify X-Webhook-Secret header
    const receivedSecret = req.headers.get("X-Webhook-Secret");
    if (!receivedSecret) {
      console.error("Missing X-Webhook-Secret header");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse the forwarded content (already verified by Connect)
    const content = await req.json();
    const { Topic, Division, Key, ExactOnlineEndpoint, EventAction } = content;

    console.log(`Received webhook: ${EventAction} on ${Topic} - Key: ${Key}`);

    // Find connection by division and verify secret
    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("id, division_id, webhook_secret")
      .eq("exact_division", Division)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      console.log("No connection found for division:", Division);
      return new Response("OK", { status: 200 });
    }

    // Verify the webhook secret matches
    const { decryptToken, isEncrypted } = await import("../_shared/crypto.ts");
    let storedSecret = connection.webhook_secret;
    if (storedSecret && isEncrypted(storedSecret)) {
      storedSecret = await decryptToken(storedSecret);
    }

    if (storedSecret !== receivedSecret) {
      console.error("Invalid webhook secret for division:", Division);
      return new Response("Unauthorized", { status: 401 });
    }

    // Log the webhook event
    await supabase.from("exact_webhook_logs").insert({
      connection_id: connection.id,
      topic: Topic,
      action: EventAction || "Unknown",
      exact_division: Division,
      entity_key: Key,
      endpoint: ExactOnlineEndpoint,
      processed: false,
    });

    // Process based on topic
    switch (Topic) {
      case "Accounts":
      case "CRM.Accounts":
        await processAccountWebhook(supabase, connection, content);
        break;
      case "SalesInvoices":
      case "SalesInvoice.SalesInvoices":
        await processInvoiceWebhook(supabase, content);
        break;
      default:
        console.log("Unhandled topic:", Topic);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

// deno-lint-ignore no-explicit-any
async function processAccountWebhook(supabase: any, connection: { id: string; division_id: string }, content: any) {
  console.log(`Processing Account webhook: ${content.EventAction} - ${content.Key}`);

  if (content.EventAction === "Delete") {
    await supabase
      .from("customers")
      .update({ exact_account_id: null })
      .eq("exact_account_id", content.Key)
      .eq("division_id", connection.division_id);
  } else {
    await supabase.from("exact_webhook_logs").update({
      processed: true,
      processed_at: new Date().toISOString(),
    }).eq("entity_key", content.Key).eq("topic", content.Topic);
  }
}

// deno-lint-ignore no-explicit-any
async function processInvoiceWebhook(supabase: any, content: any) {
  console.log(`Processing Invoice webhook: ${content.EventAction} - ${content.Key}`);
  
  await supabase.from("exact_webhook_logs").update({
    processed: true,
    processed_at: new Date().toISOString(),
  }).eq("entity_key", content.Key).eq("topic", content.Topic);
}
