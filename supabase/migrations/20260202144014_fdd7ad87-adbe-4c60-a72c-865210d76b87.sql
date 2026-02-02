-- Create table for Exact Online connections
CREATE TABLE public.exact_online_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE,
  exact_division INTEGER,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  connected_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(division_id)
);

-- Enable RLS
ALTER TABLE public.exact_online_connections ENABLE ROW LEVEL SECURITY;

-- Only admins can manage Exact Online connections
CREATE POLICY "Admins can view Exact Online connections"
ON public.exact_online_connections
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert Exact Online connections"
ON public.exact_online_connections
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update Exact Online connections"
ON public.exact_online_connections
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete Exact Online connections"
ON public.exact_online_connections
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Add exact_account_id to customers for sync
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS exact_account_id TEXT;

-- Add exact_invoice_id already exists in orders, add exact_sales_order_id
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS exact_sales_order_id TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_exact_online_connections_updated_at
BEFORE UPDATE ON public.exact_online_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();