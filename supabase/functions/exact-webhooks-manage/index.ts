import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken, encryptToken, isEncrypted } from "../_shared/crypto.ts";

const EXACT_API_URL = "https://start.exactonline.nl";
const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

// Webhook topics we want to subscribe to
const WEBHOOK_TOPICS = [
  "CRM.Accounts",           // Customer changes
  "SalesInvoice.SalesInvoices", // Invoice changes
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, divisionId } = await req.json();

    if (!divisionId) {
      throw new Error("divisionId is required");
    }

    // Get connection for this division
    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("*")
      .eq("division_id", divisionId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("No active connection found for this division");
    }

    // Get valid access token
    const accessToken = await getValidToken(supabase, connection);
    const exactDivision = connection.exact_division;

    // Webhook callback URL
    const callbackUrl = `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/exact-webhook`;

    if (action === "subscribe") {
      const results = [];

      for (const topic of WEBHOOK_TOPICS) {
        try {
          const response = await fetch(
            `${EXACT_API_URL}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                CallbackURL: callbackUrl,
                Topic: topic,
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to subscribe to ${topic}:`, errorText);
            results.push({ topic, success: false, error: errorText });
          } else {
            const data = await response.json();
            results.push({ topic, success: true, subscriptionId: data.d?.ID });
          }
        } catch (error) {
          console.error(`Error subscribing to ${topic}:`, error);
          results.push({ topic, success: false, error: String(error) });
        }
      }

      // Update connection with webhook status
      await supabase
        .from("exact_online_connections")
        .update({ webhooks_enabled: true })
        .eq("id", connection.id);

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "unsubscribe") {
      // Get all current subscriptions
      const response = await fetch(
        `${EXACT_API_URL}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get current subscriptions");
      }

      const data = await response.json();
      const subscriptions = data.d?.results || [];

      // Delete each subscription
      for (const sub of subscriptions) {
        if (sub.CallbackURL === callbackUrl) {
          await fetch(
            `${EXACT_API_URL}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions(guid'${sub.ID}')`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        }
      }

      // Update connection
      await supabase
        .from("exact_online_connections")
        .update({ webhooks_enabled: false })
        .eq("id", connection.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "status") {
      // Get current subscriptions
      const response = await fetch(
        `${EXACT_API_URL}/api/v1/${exactDivision}/webhooks/WebhookSubscriptions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get subscriptions: ${errorText}`);
      }

      const data = await response.json();
      const subscriptions = data.d?.results || [];

      // Filter to our subscriptions
      const ourSubscriptions = subscriptions.filter(
        (sub: { CallbackURL: string }) => sub.CallbackURL === callbackUrl
      );

      return new Response(
        JSON.stringify({ success: true, subscriptions: ourSubscriptions }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      throw new Error("Invalid action. Use 'subscribe', 'unsubscribe', or 'status'");
    }
  } catch (error: unknown) {
    console.error("Webhook management error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function getValidToken(
  supabase: any,
  connection: {
    id: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
  }
) {
  // Decrypt stored tokens
  let accessToken = connection.access_token;
  let refreshToken = connection.refresh_token;
  
  if (isEncrypted(accessToken)) {
    accessToken = await decryptToken(accessToken);
  }
  if (isEncrypted(refreshToken)) {
    refreshToken = await decryptToken(refreshToken);
  }

  const tokenExpiry = new Date(connection.token_expires_at);

  if (new Date() >= tokenExpiry) {
    // Refresh the token
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Missing Exact Online credentials");
    }

    const response = await fetch(EXACT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt new tokens before storing
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

    await supabase
      .from("exact_online_connections")
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  }

  return accessToken;
}
