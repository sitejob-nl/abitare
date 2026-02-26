import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getExactTokenFromConnection } from "../_shared/exact-connect.ts";

// Webhook topics we want to subscribe to
const WEBHOOK_TOPICS = [
  "CRM.Accounts",
  "SalesInvoice.SalesInvoices",
];

// SiteJob Connect webhook router — all webhooks go through here
const WEBHOOK_ROUTER_URL = "https://xeshjkznwdrxjjhbpisn.supabase.co/functions/v1/exact-webhook-router";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, divisionId } = await req.json();
    if (!divisionId) throw new Error("divisionId is required");

    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections").select("*")
      .eq("division_id", divisionId).eq("is_active", true).single();

    if (connError || !connection) throw new Error("No active connection found for this division");

    const tokenData = await getExactTokenFromConnection(connection);
    const accessToken = tokenData.access_token;
    const baseUrl = tokenData.base_url;
    const exactDivision = tokenData.division;

    if (action === "subscribe") {
      const results = [];

      for (const topic of WEBHOOK_TOPICS) {
        try {
          const response = await fetch(`${baseUrl}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ CallbackURL: WEBHOOK_ROUTER_URL, Topic: topic }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            results.push({ topic, success: false, error: errorText });
          } else {
            const data = await response.json();
            results.push({ topic, success: true, subscriptionId: data.d?.ID });
          }
        } catch (error) {
          results.push({ topic, success: false, error: String(error) });
        }
      }

      await supabase.from("exact_online_connections").update({ webhooks_enabled: true }).eq("id", connection.id);

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "unsubscribe") {
      const response = await fetch(`${baseUrl}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Failed to get current subscriptions");

      const data = await response.json();
      const subscriptions = data.d?.results || [];

      for (const sub of subscriptions) {
        if (sub.CallbackURL === WEBHOOK_ROUTER_URL) {
          await fetch(`${baseUrl}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions(guid'${sub.ID}')`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      }

      await supabase.from("exact_online_connections").update({ webhooks_enabled: false }).eq("id", connection.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "status") {
      const response = await fetch(`${baseUrl}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`Failed to get subscriptions: ${await response.text()}`);

      const data = await response.json();
      const subscriptions = data.d?.results || [];
      const ourSubscriptions = subscriptions.filter((sub: { CallbackURL: string }) => sub.CallbackURL === WEBHOOK_ROUTER_URL);

      return new Response(JSON.stringify({ success: true, subscriptions: ourSubscriptions }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid action. Use 'subscribe', 'unsubscribe', or 'status'");
    }
  } catch (error: unknown) {
    console.error("Webhook management error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
