import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";
const EXACT_API_URL = "https://start.exactonline.nl";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return redirectToApp(`?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return redirectToApp("?error=missing_params");
    }

    // Decode state to get division ID
    let divisionId: string;
    try {
      const decodedState = JSON.parse(atob(state));
      divisionId = decodedState.divisionId;
    } catch {
      return redirectToApp("?error=invalid_state");
    }

    // Exchange code for tokens
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      console.error("Missing Exact Online credentials");
      return redirectToApp("?error=config_error");
    }

    const redirectUri = `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/exact-auth-callback`;

    const tokenResponse = await fetch(EXACT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return redirectToApp("?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Get current Exact Online division
    const meResponse = await fetch(
      `${EXACT_API_URL}/api/v1/current/Me?$select=CurrentDivision`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      }
    );

    if (!meResponse.ok) {
      console.error("Failed to get current division");
      return redirectToApp("?error=failed_to_get_division");
    }

    const meData = await meResponse.json();
    const exactDivision = meData.d?.results?.[0]?.CurrentDivision;

    if (!exactDivision) {
      console.error("No division found in response");
      return redirectToApp("?error=no_division");
    }

    // Store connection in database using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return redirectToApp("?error=config_error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert connection (update if exists, insert if not)
    const { error: dbError } = await supabase
      .from("exact_online_connections")
      .upsert(
        {
          division_id: divisionId,
          exact_division: exactDivision,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          connected_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "division_id" }
      );

    if (dbError) {
      console.error("Database error:", dbError);
      return redirectToApp("?error=db_error");
    }

    // Success! Redirect back to app
    return redirectToApp("?success=true");
  } catch (error: unknown) {
    console.error("Callback error:", error);
    return redirectToApp("?error=unexpected_error");
  }
});

function redirectToApp(query: string): Response {
  const appUrl = `https://abitare.lovable.app/settings${query}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: appUrl,
    },
  });
}
