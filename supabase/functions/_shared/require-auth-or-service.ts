import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Require either a valid user session OR a service-role key.
 * Internal calls from exact-process-queue use the service-role key.
 * Frontend calls use the user's JWT.
 */
export async function requireAuthOrService(req: Request): Promise<void> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, body: { error: "Unauthorized – missing token" } };
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Allow service-role key (used by exact-process-queue)
  if (serviceRoleKey && token === serviceRoleKey) {
    return;
  }

  // Otherwise validate as user JWT
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw { status: 401, body: { error: "Unauthorized – invalid token" } };
  }
}
