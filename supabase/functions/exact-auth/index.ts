import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const EXACT_AUTH_URL = "https://start.exactonline.nl/api/oauth2/auth";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    if (!clientId) {
      throw new Error("EXACT_CLIENT_ID is not configured");
    }

    const { divisionId } = await req.json();
    if (!divisionId) {
      throw new Error("divisionId is required");
    }

    // Build redirect URI - the callback edge function
    const redirectUri = `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/exact-auth-callback`;

    // State contains the division ID so we know which Abitare division to link
    const state = JSON.stringify({ divisionId });
    const encodedState = btoa(state);

    // Build OAuth authorization URL
    const authUrl = new URL(EXACT_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", encodedState);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating auth URL:", error);
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
