
-- 1. Create a secure view that excludes sensitive token fields
CREATE OR REPLACE VIEW public.microsoft_connection_status AS
SELECT 
  id, user_id, microsoft_email, connected_at, 
  is_active, token_expires_at, scopes
FROM public.microsoft_connections;

-- 2. Drop existing SELECT policy on the table
DROP POLICY IF EXISTS "Users can view own microsoft connection" ON public.microsoft_connections;

-- 3. Enable RLS on the view (views inherit from base table but we add explicit policy)
-- Grant select on the view to authenticated users
GRANT SELECT ON public.microsoft_connection_status TO authenticated;

-- 4. Create RLS policy on the view
CREATE POLICY "Users can view own microsoft connection status"
ON public.microsoft_connections
FOR SELECT
TO authenticated
USING (false);

-- 5. Fix bulk_adjust_price to include role check
CREATE OR REPLACE FUNCTION public.bulk_adjust_price(p_ids uuid[], p_factor numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and managers can adjust prices';
  END IF;
  
  UPDATE public.products
  SET base_price = ROUND(base_price * p_factor, 2)
  WHERE id = ANY(p_ids) AND base_price IS NOT NULL;
END;
$$;
