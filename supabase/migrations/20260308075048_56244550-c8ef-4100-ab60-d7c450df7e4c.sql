
-- SECURITY FIX 1: Prevent division_id escalation on profiles
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update_restricted" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (
    (id = auth.uid() AND division_id IS NOT DISTINCT FROM (SELECT p.division_id FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- SECURITY FIX 2: Restrict customer_portal_tokens SELECT
DROP POLICY IF EXISTS "Authenticated users can view tokens" ON public.customer_portal_tokens;

CREATE POLICY "Restricted token access" ON public.customer_portal_tokens
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  );
