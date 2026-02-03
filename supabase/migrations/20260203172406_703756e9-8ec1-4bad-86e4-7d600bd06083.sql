-- Fix resterende permissieve RLS policies

-- ============================================
-- 1. SERVICE_TICKET_ASSIGNEES - Verwijder oude policies
-- ============================================

-- Verwijder oude permissieve policies
DROP POLICY IF EXISTS "Authenticated users can delete assignees" ON public.service_ticket_assignees;
DROP POLICY IF EXISTS "Authenticated users can manage assignees" ON public.service_ticket_assignees;
DROP POLICY IF EXISTS "Authenticated users can update assignees" ON public.service_ticket_assignees;

-- ============================================
-- 2. SERVICE_TICKET_ATTACHMENTS - Verwijder oude UPDATE policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can update attachments" ON public.service_ticket_attachments;

-- Nieuwe UPDATE policy: alleen admin kan bijlagen updaten
CREATE POLICY "Admins can update attachments" 
ON public.service_ticket_attachments FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- ============================================
-- 3. SERVICE_TICKET_NOTES - Verwijder oude INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create notes" ON public.service_ticket_notes;

-- Nieuwe INSERT policy: alleen gebruikers met toegang tot ticket
CREATE POLICY "Users with ticket access can create notes" 
ON public.service_ticket_notes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_id
    AND (
      public.is_admin_or_manager(auth.uid())
      OR st.division_id = public.get_user_division_id(auth.uid())
      OR st.division_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.service_ticket_assignees sta
        WHERE sta.ticket_id = st.id AND sta.user_id = auth.uid()
      )
    )
  )
);

-- ============================================
-- 4. SERVICE_TICKET_STATUS_HISTORY - Verwijder oude INSERT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create status history" ON public.service_ticket_status_history;

-- ============================================
-- 5. SERVICE_TICKETS - Fix INSERT policy
-- ============================================

-- Verwijder oude policy
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.service_tickets;

-- Nieuwe INSERT policy: publiek formulier mag tickets aanmaken (anon), 
-- maar authenticated users krijgen hun division_id automatisch gezet
CREATE POLICY "Public can create tickets" 
ON public.service_tickets FOR INSERT TO anon
WITH CHECK (
  -- Anonieme gebruikers mogen alleen tickets aanmaken zonder division_id en created_by
  division_id IS NULL 
  AND created_by IS NULL
);

CREATE POLICY "Authenticated users can create tickets" 
ON public.service_tickets FOR INSERT TO authenticated
WITH CHECK (
  -- Authenticated users mogen tickets aanmaken
  -- Als ze een division_id zetten, moet het hun eigen divisie zijn of null
  (division_id IS NULL OR division_id = public.get_user_division_id(auth.uid()) OR public.is_admin_or_manager(auth.uid()))
);