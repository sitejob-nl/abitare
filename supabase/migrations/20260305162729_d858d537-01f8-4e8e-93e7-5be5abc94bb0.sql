
-- Add model_code, model_name, supplier_id to order_sections (matching quote_sections)
ALTER TABLE public.order_sections 
  ADD COLUMN IF NOT EXISTS model_code text,
  ADD COLUMN IF NOT EXISTS model_name text,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);
