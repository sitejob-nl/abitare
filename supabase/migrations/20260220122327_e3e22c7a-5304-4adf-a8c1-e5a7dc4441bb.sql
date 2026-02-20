-- Remove public token access policy that allows unauthenticated enumeration of portal tokens
DROP POLICY IF EXISTS "Public can read active tokens" ON public.customer_portal_tokens;