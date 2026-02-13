
-- Drop overly permissive INSERT/UPDATE policies
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;

-- INSERT: only own division or admin/manager
CREATE POLICY "Users can create projects in their division"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    division_id IS NULL
    OR division_id = public.get_user_division_id(auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

-- UPDATE: only own division or admin/manager
CREATE POLICY "Users can update projects in their division"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    division_id IS NULL
    OR division_id = public.get_user_division_id(auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );
