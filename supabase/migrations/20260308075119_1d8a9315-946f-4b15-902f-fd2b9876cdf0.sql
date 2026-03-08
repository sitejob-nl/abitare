
-- Fix tradeplace_messages: change from public to authenticated + admin only
DROP POLICY IF EXISTS "Service role can insert tradeplace messages" ON public.tradeplace_messages;

CREATE POLICY "Admins can insert tradeplace messages" ON public.tradeplace_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));
