import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

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
    // Validate webhook secret
    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");

    if (!secret || secret !== expectedSecret) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entry = await req.json();

    // Parse Meta webhook entry
    const changes = entry?.changes;
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      console.log("No changes in entry, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const value = changes[0]?.value;
    if (!value?.messages || value.messages.length === 0) {
      console.log("No messages in entry (possibly a status update), skipping");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    // Only process text messages for now
    if (message.type !== "text") {
      console.log(`Skipping non-text message type: ${message.type}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromNumber = message.from; // e.g. "31687654321"
    const bodyText = message.text?.body || "";
    const timestamp = message.timestamp; // unix timestamp string
    const senderName = contact?.profile?.name || fromNumber;
    const messageId = message.id; // wamid.xxxxx

    // Convert unix timestamp to ISO string
    const sentAt = new Date(parseInt(timestamp) * 1000).toISOString();

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Normalize phone number: strip all non-digit characters
    const normalizedFrom = fromNumber.replace(/\D/g, "");

    // Also try with leading 0 (Dutch format): 31687654321 -> 0687654321
    const dutchLocal = normalizedFrom.startsWith("31")
      ? "0" + normalizedFrom.slice(2)
      : null;

    // Search for customer by phone, phone_2, or mobile
    // We need to normalize the DB values too, so we use a broader approach
    const { data: customers } = await supabase
      .from("customers")
      .select("id, phone, phone_2, mobile")
      .or("phone.not.is.null,phone_2.not.is.null,mobile.not.is.null");

    let customerId: string | null = null;

    if (customers) {
      for (const customer of customers) {
        const phones = [customer.phone, customer.phone_2, customer.mobile]
          .filter(Boolean)
          .map((p: string) => p.replace(/\D/g, ""));

        if (
          phones.includes(normalizedFrom) ||
          (dutchLocal && phones.includes(dutchLocal.replace(/\D/g, "")))
        ) {
          customerId = customer.id;
          break;
        }
      }
    }

    // Insert into communication_log
    const { error: insertError } = await supabase
      .from("communication_log")
      .insert({
        type: "whatsapp",
        direction: "inbound",
        subject: `WhatsApp van ${senderName}`,
        body_preview: bodyText.substring(0, 500),
        customer_id: customerId,
        sent_at: sentAt,
        external_message_id: messageId,
        metadata: {
          from_number: fromNumber,
          sender_name: senderName,
          message_type: message.type,
        },
      });

    if (insertError) {
      console.error("Error inserting communication log:", insertError);
      // Still return 200 to avoid SiteJob Connect retrying
      return new Response(JSON.stringify({ ok: true, warning: "insert_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`WhatsApp message stored. Customer: ${customerId || "unknown"}, From: ${fromNumber}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    // Return 200 to avoid retries
    return new Response(JSON.stringify({ ok: true, error: "processing_failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
