import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
    const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET");
    const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      throw new Error("Microsoft credentials not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Verify user is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Not authenticated");
    }

    // Get request body
    const body = await req.json();
    const { endpoint, method = "GET", data } = body;

    if (!endpoint) {
      throw new Error("Endpoint is required");
    }

    // Get user's Microsoft connection using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: connection, error: connError } = await supabaseAdmin
      .from("microsoft_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("Microsoft account not connected");
    }

    let accessToken = connection.access_token;

    // Check if token is expired or about to expire (5 min buffer)
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() < bufferMs) {
      console.log("Token expired or expiring soon, refreshing...");
      
      try {
        const newTokens = await refreshAccessToken(
          connection.refresh_token,
          MICROSOFT_CLIENT_ID,
          MICROSOFT_CLIENT_SECRET,
          MICROSOFT_TENANT_ID
        );

        // Update tokens in database
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
        
        await supabaseAdmin
          .from("microsoft_connections")
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            token_expires_at: newExpiresAt.toISOString(),
          })
          .eq("id", connection.id);

        accessToken = newTokens.access_token;
        console.log("Token refreshed successfully");
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        
        // Mark connection as inactive
        await supabaseAdmin
          .from("microsoft_connections")
          .update({ is_active: false })
          .eq("id", connection.id);

        throw new Error("Microsoft session expired. Please reconnect your account.");
      }
    }

    // Make the Microsoft Graph API call
    const graphUrl = `https://graph.microsoft.com/v1.0${endpoint}`;
    
    const graphOptions: RequestInit = {
      method: method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (data && method !== "GET") {
      graphOptions.body = JSON.stringify(data);
    }

    const graphResponse = await fetch(graphUrl, graphOptions);

    // Handle different response types
    const contentType = graphResponse.headers.get("content-type");
    let responseData: unknown;

    if (graphResponse.status === 204) {
      responseData = { success: true };
    } else if (contentType?.includes("application/json")) {
      responseData = await graphResponse.json();
    } else {
      responseData = { text: await graphResponse.text() };
    }

    if (!graphResponse.ok) {
      console.error("Graph API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "Graph API call failed", 
          details: responseData,
          status: graphResponse.status 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: graphResponse.status,
        }
      );
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in microsoft-api:", error);
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
