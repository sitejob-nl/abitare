import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExactWebhookPayload {
  Content: {
    Topic: string;
    Action: string;
    Division: number;
    Key: string;
    ExactOnlineEndpoint: string;
  };
  HashCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("EXACT_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("EXACT_WEBHOOK_SECRET not configured");
      return new Response("Configuration error", { status: 500 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response("Configuration error", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload
    const payload: ExactWebhookPayload = await req.json();
    console.log("Received webhook:", JSON.stringify(payload));

    // Validate the webhook signature using Web Crypto API
    const content = payload.Content;
    const receivedHash = payload.HashCode;

    // Create HMAC signature using the webhook secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(JSON.stringify(content));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const calculatedHash = btoa(String.fromCharCode(...new Uint8Array(signature)));

    if (calculatedHash !== receivedHash) {
      console.error("Invalid webhook signature - rejecting request");
      return new Response("Unauthorized", { status: 401 });
    }

    // Get the connection for this division
    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("*")
      .eq("exact_division", content.Division)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      console.log("No connection found for division:", content.Division);
      return new Response("OK", { status: 200 }); // Acknowledge but don't process
    }

    // Log the webhook event
    await supabase.from("exact_webhook_logs").insert({
      connection_id: connection.id,
      topic: content.Topic,
      action: content.Action,
      exact_division: content.Division,
      entity_key: content.Key,
      endpoint: content.ExactOnlineEndpoint,
      processed: false,
    });

    // Process based on topic
    switch (content.Topic) {
      case "CRM.Accounts":
        await processAccountWebhook(supabase, connection, content);
        break;
      case "SalesInvoice.SalesInvoices":
        await processInvoiceWebhook(supabase, connection, content);
        break;
      default:
        console.log("Unhandled topic:", content.Topic);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(errorMessage, { status: 500, headers: corsHeaders });
  }
});

// deno-lint-ignore no-explicit-any
async function processAccountWebhook(
  supabase: any,
  connection: { id: string; division_id: string },
  content: ExactWebhookPayload["Content"]
) {
  console.log(`Processing Account webhook: ${content.Action} - ${content.Key}`);

  if (content.Action === "Delete") {
    // Mark customer as needing sync review (don't auto-delete)
    await supabase
      .from("customers")
      .update({ exact_account_id: null })
      .eq("exact_account_id", content.Key)
      .eq("division_id", connection.division_id);
  } else {
    // For Create/Update, mark as processed
    await supabase.from("exact_webhook_logs").update({
      processed: true,
      processed_at: new Date().toISOString(),
    }).eq("entity_key", content.Key).eq("topic", content.Topic);
  }
}

// deno-lint-ignore no-explicit-any
async function processInvoiceWebhook(
  supabase: any,
  connection: { id: string; division_id: string },
  content: ExactWebhookPayload["Content"]
) {
  console.log(`Processing Invoice webhook: ${content.Action} - ${content.Key}`);
  
  // Log for processing - actual update would fetch from Exact API
  await supabase.from("exact_webhook_logs").update({
    processed: true,
    processed_at: new Date().toISOString(),
  }).eq("entity_key", content.Key).eq("topic", content.Topic);
}
