-- Fix RLS policies for webhook logs - these are called by edge functions using service role
-- The service role bypasses RLS anyway, so we can make these more restrictive

-- Drop the permissive policies
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON public.exact_webhook_logs;
DROP POLICY IF EXISTS "Service role can update webhook logs" ON public.exact_webhook_logs;

-- Create proper policies - only admins can manage webhook logs through the app
-- Edge functions use service role which bypasses RLS
CREATE POLICY "Admins can insert webhook logs"
ON public.exact_webhook_logs
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update webhook logs"
ON public.exact_webhook_logs
FOR UPDATE
USING (public.is_admin(auth.uid()));