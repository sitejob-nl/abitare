import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
    const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    // Debug logging
    console.log("Environment check:", {
      MICROSOFT_CLIENT_ID_present: !!MICROSOFT_CLIENT_ID,
      MICROSOFT_TENANT_ID: MICROSOFT_TENANT_ID,
      SUPABASE_URL_present: !!SUPABASE_URL,
      SUPABASE_ANON_KEY_present: !!SUPABASE_ANON_KEY,
    });

    if (!MICROSOFT_CLIENT_ID) {
      throw new Error("MICROSOFT_CLIENT_ID is not configured");
    }

    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL is not configured");
    }

    if (!SUPABASE_ANON_KEY) {
      throw new Error("SUPABASE_ANON_KEY is not configured");
    }

    // Verify user is authenticated
    const authHeader = req.headers.get("authorization");
    console.log("Authorization header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required", details: "No authorization header was provided in the request" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error("Auth getUser error:", userError);
      return new Response(
        JSON.stringify({ error: "Not authenticated", details: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    if (!user) {
      console.error("No user returned from getUser");
      return new Response(
        JSON.stringify({ error: "Not authenticated", details: "No user found for provided token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    console.log("User authenticated:", user.id);

    // Build the Microsoft OAuth URL
    const redirectUri = `${SUPABASE_URL}/functions/v1/microsoft-auth-callback`;
    const scopes = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "User.Read",
      "Calendars.ReadWrite",
      "Mail.ReadWrite",
      "Mail.Send",
    ];

    // Create state parameter with user ID for callback
    const state = btoa(JSON.stringify({ 
      userId: user.id,
      returnUrl: req.headers.get("origin") || "https://abitare.lovable.app"
    }));

    const authUrl = new URL(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`
    );
    authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "consent");

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in microsoft-auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
