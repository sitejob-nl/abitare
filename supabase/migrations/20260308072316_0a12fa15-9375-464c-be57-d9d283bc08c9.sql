
-- P5.1: Invoice Model Redesign
-- Add invoice_type enum
CREATE TYPE public.invoice_type AS ENUM ('standaard', 'aanbetaling', 'restbetaling', 'meerwerk', 'creditnota');

-- Add invoice_type and parent_order_id to orders
ALTER TABLE public.orders 
  ADD COLUMN invoice_type public.invoice_type DEFAULT NULL,
  ADD COLUMN parent_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL DEFAULT NULL;

-- Create index for parent_order_id lookups
CREATE INDEX idx_orders_parent_order_id ON public.orders(parent_order_id) WHERE parent_order_id IS NOT NULL;

-- Set invoice_type for existing standalone invoices
UPDATE public.orders SET invoice_type = 'standaard' WHERE is_standalone_invoice = true;
