import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Parse state to get user info and return URL
    let stateData: { userId: string; returnUrl: string } | null = null;
    try {
      if (state) {
        stateData = JSON.parse(atob(state));
      }
    } catch (e) {
      console.error("Failed to parse state:", e);
    }

    const returnUrl = stateData?.returnUrl || "https://abitare.lovable.app";

    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return Response.redirect(
        `${returnUrl}/settings?microsoft_error=${encodeURIComponent(errorDescription || error)}`,
        302
      );
    }

    if (!code || !stateData?.userId) {
      return Response.redirect(
        `${returnUrl}/settings?microsoft_error=missing_code_or_state`,
        302
      );
    }

    const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
    const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET");
    const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      throw new Error("Microsoft credentials not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/microsoft-auth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return Response.redirect(
        `${returnUrl}/settings?microsoft_error=token_exchange_failed`,
        302
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error("Failed to get user info:", await userInfoResponse.text());
      return Response.redirect(
        `${returnUrl}/settings?microsoft_error=user_info_failed`,
        302
      );
    }

    const userInfo = await userInfoResponse.json();

    // Store connection in database using service role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const expiresAt = new Date(Date.now() + expires_in * 1000);
    const scopes = scope.split(" ");

    // Upsert the connection
    const { error: dbError } = await supabaseAdmin
      .from("microsoft_connections")
      .upsert(
        {
          user_id: stateData.userId,
          access_token: access_token,
          refresh_token: refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: scopes,
          microsoft_user_id: userInfo.id,
          microsoft_email: userInfo.mail || userInfo.userPrincipalName,
          connected_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Database error:", dbError);
      return Response.redirect(
        `${returnUrl}/settings?microsoft_error=database_error`,
        302
      );
    }

    console.log(`Microsoft connection saved for user ${stateData.userId}`);

    // Redirect back to settings with success
    return Response.redirect(`${returnUrl}/settings?microsoft_connected=true`, 302);
  } catch (error: unknown) {
    console.error("Error in microsoft-auth-callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return Response.redirect(
      `https://abitare.lovable.app/settings?microsoft_error=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});
