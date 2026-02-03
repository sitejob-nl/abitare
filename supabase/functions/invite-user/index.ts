import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify calling user is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Geen authenticatie" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify calling user with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: userError } = await anonClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Ongeldige sessie" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calling user is admin using service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminCheck } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: "Alleen administrators kunnen gebruikers uitnodigen" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, full_name, phone, division_id, roles } = await req.json();

    if (!email || !full_name || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Email, naam en minimaal één rol zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate roles
    const validRoles = ["admin", "manager", "verkoper", "assistent", "monteur", "werkvoorbereiding", "administratie"];
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Ongeldige rol: ${role}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      // Check for duplicate email
      if (createError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Dit emailadres is al geregistreerd" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("User creation failed");
    }

    const userId = newUser.user.id;

    // Update profile with additional info
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update({
        full_name,
        phone: phone || null,
        division_id: division_id || null,
        is_active: true,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Insert roles
    const roleInserts = roles.map((role: string) => ({
      user_id: userId,
      role,
    }));

    const { error: rolesError } = await serviceClient
      .from("user_roles")
      .insert(roleInserts);

    if (rolesError) {
      console.error("Roles insert error:", rolesError);
    }

    // Send password reset email so user can set their password
    const { error: resetError } = await serviceClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${req.headers.get("origin") || supabaseUrl}/login`,
      },
    });

    if (resetError) {
      console.warn("Could not generate magic link:", resetError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        message: `Gebruiker ${email} is aangemaakt`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Invite user error:", error);
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
