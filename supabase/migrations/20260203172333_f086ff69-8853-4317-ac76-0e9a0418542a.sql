-- Fase 1: Kritieke Beveiligingsfixes - Service Tickets Module

-- ============================================
-- 1. SERVICE_TICKETS - Restrictiever maken
-- ============================================

-- Drop bestaande permissieve UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON public.service_tickets;

-- Nieuwe UPDATE policy: alleen toegewezen medewerkers, divisie-medewerkers, of admins/managers
CREATE POLICY "Users can update assigned or division tickets" 
ON public.service_tickets FOR UPDATE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid()) 
  OR division_id = public.get_user_division_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.service_ticket_assignees 
    WHERE ticket_id = service_tickets.id 
    AND user_id = auth.uid()
  )
);

-- ============================================
-- 2. SERVICE_TICKET_NOTES - Eigen notities verwijderen
-- ============================================

-- Drop bestaande permissieve DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete notes" ON public.service_ticket_notes;

-- Nieuwe DELETE policy: alleen eigen notities of admin
CREATE POLICY "Users can delete own notes" 
ON public.service_ticket_notes FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- Drop bestaande permissieve UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update notes" ON public.service_ticket_notes;

-- Nieuwe UPDATE policy: alleen eigen notities of admin
CREATE POLICY "Users can update own notes" 
ON public.service_ticket_notes FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================
-- 3. SERVICE_TICKET_ATTACHMENTS - Alleen authenticated uploads
-- ============================================

-- Drop bestaande permissieve INSERT policy (die anon toestaat!)
DROP POLICY IF EXISTS "Anyone can upload attachments" ON public.service_ticket_attachments;

-- Nieuwe INSERT policy: alleen geauthenticeerde gebruikers
CREATE POLICY "Authenticated users can upload attachments" 
ON public.service_ticket_attachments FOR INSERT TO authenticated
WITH CHECK (
  -- Gebruiker moet admin/manager zijn, of aan het ticket toegewezen, of in dezelfde divisie
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_id
    AND (
      public.is_admin_or_manager(auth.uid())
      OR st.division_id = public.get_user_division_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.service_ticket_assignees sta
        WHERE sta.ticket_id = st.id AND sta.user_id = auth.uid()
      )
    )
  )
);

-- Drop bestaande permissieve DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON public.service_ticket_attachments;

-- Nieuwe DELETE policy: alleen eigen uploads of admin
CREATE POLICY "Users can delete own attachments" 
ON public.service_ticket_attachments FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid() 
  OR public.is_admin(auth.uid())
);

-- ============================================
-- 4. SERVICE_TICKET_ASSIGNEES - Beperken tot managers/admins
-- ============================================

-- Drop bestaande permissieve INSERT policy
DROP POLICY IF EXISTS "Authenticated users can add assignees" ON public.service_ticket_assignees;

-- Nieuwe INSERT policy: alleen admin/manager of reeds toegewezen aan ticket
CREATE POLICY "Managers can add assignees" 
ON public.service_ticket_assignees FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_manager(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_id
    AND st.division_id = public.get_user_division_id(auth.uid())
  )
);

-- Drop bestaande permissieve DELETE policy
DROP POLICY IF EXISTS "Authenticated users can remove assignees" ON public.service_ticket_assignees;

-- Nieuwe DELETE policy: alleen admin/manager
CREATE POLICY "Managers can remove assignees" 
ON public.service_ticket_assignees FOR DELETE TO authenticated
USING (
  public.is_admin_or_manager(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_id
    AND st.division_id = public.get_user_division_id(auth.uid())
  )
);

-- ============================================
-- 5. SERVICE_TICKET_STATUS_HISTORY - Audit trail beveiligen
-- ============================================

-- Drop bestaande permissieve INSERT policy
DROP POLICY IF EXISTS "Authenticated users can add status history" ON public.service_ticket_status_history;

-- Nieuwe INSERT policy: alleen als gebruiker het ticket mag updaten
CREATE POLICY "Users with ticket access can add status history" 
ON public.service_ticket_status_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_id
    AND (
      public.is_admin_or_manager(auth.uid())
      OR st.division_id = public.get_user_division_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.service_ticket_assignees sta
        WHERE sta.ticket_id = st.id AND sta.user_id = auth.uid()
      )
    )
  )
);

-- Voorkom dat status history verwijderd kan worden (audit trail)
DROP POLICY IF EXISTS "No one can delete status history" ON public.service_ticket_status_history;
CREATE POLICY "No one can delete status history" 
ON public.service_ticket_status_history FOR DELETE TO authenticated
USING (false);

-- ============================================
-- 6. Storage Bucket Policies voor service-attachments
-- ============================================

-- Verwijder bestaande policies als die er zijn
DROP POLICY IF EXISTS "Authenticated users can upload service attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view service attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own service attachments" ON storage.objects;

-- Upload policy: alleen geauthenticeerde gebruikers
CREATE POLICY "Authenticated users can upload service attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'service-attachments');

-- View policy: geauthenticeerde gebruikers kunnen bijlagen zien
CREATE POLICY "Authenticated users can view service attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'service-attachments');

-- Delete policy: alleen eigen uploads of admin
CREATE POLICY "Users can delete own service attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'service-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
  )
);