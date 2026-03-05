import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verify the calling user is authenticated and return their user ID.
 * Throws an object { status, body } if authentication fails.
 */
export async function requireAuth(req: Request): Promise<{ userId: string; token: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, body: { error: "Unauthorized – missing token" } };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw { status: 401, body: { error: "Unauthorized – invalid token" } };
  }

  return { userId: data.user.id, token };
}
