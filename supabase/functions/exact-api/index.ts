import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const EXACT_API_URL = "https://start.exactonline.nl";
const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

serve(async (req) => {
  // Handle CORS preflight
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

    const { divisionId, endpoint, method = "GET", body } = await req.json();

    if (!divisionId || !endpoint) {
      throw new Error("divisionId and endpoint are required");
    }

    // Get connection for this division
    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("*")
      .eq("division_id", divisionId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("No active Exact Online connection found for this division");
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    const tokenExpiry = new Date(connection.token_expires_at);
    
    if (new Date() >= tokenExpiry) {
      // Refresh the token
      const newTokens = await refreshAccessToken(connection.refresh_token);
      accessToken = newTokens.access_token;

      // Update stored tokens
      const tokenExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await supabase
        .from("exact_online_connections")
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
        })
        .eq("id", connection.id);
    }

    // Make the actual API request to Exact Online
    const exactEndpoint = endpoint.replace("{division}", connection.exact_division.toString());
    const exactUrl = `${EXACT_API_URL}${exactEndpoint}`;

    const exactResponse = await fetch(exactUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!exactResponse.ok) {
      const errorText = await exactResponse.text();
      console.error("Exact API error:", errorText);
      throw new Error(`Exact API error: ${exactResponse.status} - ${errorText}`);
    }

    const data = await exactResponse.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("API proxy error:", error);
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

async function refreshAccessToken(refreshToken: string) {
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
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json();
}
