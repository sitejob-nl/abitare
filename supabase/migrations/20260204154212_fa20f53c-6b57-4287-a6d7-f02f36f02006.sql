-- Fix security definer warning by explicitly setting SECURITY INVOKER
-- This ensures the views use the permissions of the querying user (correct behavior)
ALTER VIEW public.installer_orders SET (security_invoker = on);
ALTER VIEW public.installer_order_lines SET (security_invoker = on);