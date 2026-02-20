
-- Fix the security definer view issue by setting it to SECURITY INVOKER
ALTER VIEW public.microsoft_connection_status SET (security_invoker = on);

-- Drop the blocking policy and create a proper one that allows users to see only their own row via the view
DROP POLICY IF EXISTS "Users can view own microsoft connection status" ON public.microsoft_connections;

-- Re-enable SELECT for own rows (view will filter to safe columns only)
CREATE POLICY "Users can view own connection via view"
ON public.microsoft_connections
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
