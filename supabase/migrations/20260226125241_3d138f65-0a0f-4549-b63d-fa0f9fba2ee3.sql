
-- Blok 2: Prijslijst versiebeheer
ALTER TABLE public.price_groups 
  ADD COLUMN IF NOT EXISTS edition text,
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date;

-- Blok 3: Prijstraceerbaarheid per offerteregel
ALTER TABLE public.quote_lines 
  ADD COLUMN IF NOT EXISTS price_source_metadata jsonb;

-- Blok 4: Product varianten
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS parent_product_id uuid REFERENCES public.products(id);
CREATE INDEX IF NOT EXISTS idx_products_parent ON public.products(parent_product_id);

-- Blok 7d: Raw import payload opslag
ALTER TABLE public.import_logs
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

-- Blok 7e: Product documenten tabel
CREATE TABLE IF NOT EXISTS public.product_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'datasheet',
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product documents" 
  ON public.product_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage product documents"
  ON public.product_documents FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));
