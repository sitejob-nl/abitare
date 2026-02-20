
-- Fix security definer views by setting them to security invoker
ALTER VIEW public.installer_orders SET (security_invoker = on);
ALTER VIEW public.installer_order_lines SET (security_invoker = on);
