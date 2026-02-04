-- Add column to identify standalone invoices (invoices not linked to a quote)
-- These are orders created directly as invoices without going through quote->order flow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_standalone_invoice boolean DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_orders_standalone_invoice ON public.orders(is_standalone_invoice) WHERE is_standalone_invoice = true;