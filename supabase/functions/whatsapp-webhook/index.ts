import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const value = changes[0]?.value;

    // Process status updates (delivered, read, etc.)
    if (value?.statuses && value.statuses.length > 0) {
      for (const status of value.statuses) {
        const wamid = status.id;
        const newStatus = status.status; // sent, delivered, read, failed

        const { error: updateError } = await supabase
          .from("communication_log")
          .update({
            metadata: supabase.rpc ? undefined : undefined, // We can't merge JSON easily, so we fetch + update
          })
          .eq("external_message_id", wamid);

        // Fetch the existing record to merge metadata
        const { data: existing } = await supabase
          .from("communication_log")
          .select("metadata")
          .eq("external_message_id", wamid)
          .single();

        if (existing) {
          const updatedMetadata = {
            ...(typeof existing.metadata === "object" && existing.metadata !== null ? existing.metadata : {}),
            status: newStatus,
            status_updated_at: new Date().toISOString(),
          };

          await supabase
            .from("communication_log")
            .update({ metadata: updatedMetadata })
            .eq("external_message_id", wamid);

          console.log(`Status update: ${wamid} -> ${newStatus}`);
        }
      }
    }

    // Process incoming messages
    if (!value?.messages || value.messages.length === 0) {
      if (value?.statuses) {
        // Already processed status updates above
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("No messages or statuses in entry, skipping");
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

    const fromNumber = message.from;
    const bodyText = message.text?.body || "";
    const timestamp = message.timestamp;
    const senderName = contact?.profile?.name || fromNumber;
    const messageId = message.id;

    const sentAt = new Date(parseInt(timestamp) * 1000).toISOString();
    const normalizedFrom = normalizePhone(fromNumber);

    // Search for customer by phone, phone_2, or mobile
    const { data: customers } = await supabase
      .from("customers")
      .select("id, phone, phone_2, mobile")
      .or("phone.not.is.null,phone_2.not.is.null,mobile.not.is.null");

    let customerId: string | null = null;

    if (customers) {
      for (const customer of customers) {
        const phones = [customer.phone, customer.phone_2, customer.mobile]
          .filter(Boolean)
          .map((p: string) => normalizePhone(p));

        if (phones.includes(normalizedFrom)) {
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
          status: "received",
        },
      });

    if (insertError) {
      console.error("Error inserting communication log:", insertError);
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
    return new Response(JSON.stringify({ ok: true, error: "processing_failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
