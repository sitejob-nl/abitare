-- Create customer portal tokens table for token-based access
CREATE TABLE public.customer_portal_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create index for fast token lookup
CREATE INDEX idx_customer_portal_tokens_token ON public.customer_portal_tokens(token);
CREATE INDEX idx_customer_portal_tokens_customer ON public.customer_portal_tokens(customer_id);

-- Create customer planning preferences table
CREATE TABLE public.customer_planning_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.customer_portal_tokens(id) ON DELETE CASCADE,
  preferred_date_1 DATE,
  preferred_date_2 DATE,
  preferred_date_3 DATE,
  time_preference TEXT CHECK (time_preference IN ('ochtend', 'middag', 'geen_voorkeur')),
  remarks TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planning_preferences_order ON public.customer_planning_preferences(order_id);

-- Enable RLS on both tables
ALTER TABLE public.customer_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_planning_preferences ENABLE ROW LEVEL SECURITY;

-- RLS for customer_portal_tokens: authenticated users can manage tokens
CREATE POLICY "Authenticated users can view tokens"
ON public.customer_portal_tokens FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tokens"
ON public.customer_portal_tokens FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tokens"
ON public.customer_portal_tokens FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete tokens"
ON public.customer_portal_tokens FOR DELETE
USING (is_admin(auth.uid()));

-- Public read access for valid tokens (for portal access without auth)
CREATE POLICY "Public can read active tokens"
ON public.customer_portal_tokens FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- RLS for customer_planning_preferences
CREATE POLICY "Authenticated users can view planning preferences"
ON public.customer_planning_preferences FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can create planning preferences with valid token"
ON public.customer_planning_preferences FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_portal_tokens t
    WHERE t.id = token_id
    AND t.is_active = true
    AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);

CREATE POLICY "Authenticated users can update planning preferences"
ON public.customer_planning_preferences FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete planning preferences"
ON public.customer_planning_preferences FOR DELETE
USING (is_admin(auth.uid()));