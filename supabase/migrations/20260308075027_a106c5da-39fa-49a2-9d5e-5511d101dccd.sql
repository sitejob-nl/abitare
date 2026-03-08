
-- =====================================================
-- SECURITY FIX 3: Restrict work_report_damages to report owner or admin
-- =====================================================

-- Drop all overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create damages" ON public.work_report_damages;
DROP POLICY IF EXISTS "Authenticated users can view damages" ON public.work_report_damages;
DROP POLICY IF EXISTS "Authenticated users can update damages" ON public.work_report_damages;
DROP POLICY IF EXISTS "Authenticated users can delete damages" ON public.work_report_damages;

-- Create a helper function to check work report ownership
CREATE OR REPLACE FUNCTION public.is_work_report_owner(_work_report_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.work_reports
    WHERE id = _work_report_id AND installer_id = _user_id
  );
$$;

-- Scoped policies for work_report_damages
CREATE POLICY "damages_select" ON public.work_report_damages
  FOR SELECT TO authenticated
  USING (
    public.is_work_report_owner(work_report_id, auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "damages_insert" ON public.work_report_damages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_work_report_owner(work_report_id, auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "damages_update" ON public.work_report_damages
  FOR UPDATE TO authenticated
  USING (
    public.is_work_report_owner(work_report_id, auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "damages_delete" ON public.work_report_damages
  FOR DELETE TO authenticated
  USING (
    public.is_work_report_owner(work_report_id, auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

-- =====================================================
-- SECURITY FIX 4: Restrict whatsapp_auto_templates write to admins
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_auto_templates" ON public.whatsapp_auto_templates;

CREATE POLICY "Admin/manager can manage whatsapp_auto_templates" ON public.whatsapp_auto_templates
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- =====================================================
-- SECURITY FIX 5: Scope service_tickets to division
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.service_tickets;

CREATE POLICY "Division-scoped ticket access" ON public.service_tickets
  FOR SELECT TO authenticated
  USING (
    division_id = public.get_user_division_id(auth.uid())
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.service_ticket_assignees
      WHERE ticket_id = id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- SECURITY FIX 6: Scope service_ticket_notes to division
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view notes" ON public.service_ticket_notes;

CREATE POLICY "Division-scoped ticket notes access" ON public.service_ticket_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_tickets st
      WHERE st.id = ticket_id
      AND (
        st.division_id = public.get_user_division_id(auth.uid())
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.service_ticket_assignees
          WHERE ticket_id = st.id AND user_id = auth.uid()
        )
      )
    )
  );

-- =====================================================
-- SECURITY FIX 7: Scope service_ticket_attachments to division
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view attachments" ON public.service_ticket_attachments;

CREATE POLICY "Division-scoped ticket attachments access" ON public.service_ticket_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_tickets st
      WHERE st.id = ticket_id
      AND (
        st.division_id = public.get_user_division_id(auth.uid())
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.service_ticket_assignees
          WHERE ticket_id = st.id AND user_id = auth.uid()
        )
      )
    )
  );
