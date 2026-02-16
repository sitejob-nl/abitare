
-- 1. Add columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS pims_last_synced timestamptz,
  ADD COLUMN IF NOT EXISTS specifications jsonb;

-- 2. Create product_images table
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text NOT NULL,
  type text DEFAULT 'main',
  sort_order int DEFAULT 0,
  source text DEFAULT 'pims',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);

-- 3. Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product images"
  ON public.product_images FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin/manager can insert product images"
  ON public.product_images FOR INSERT
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager can update product images"
  ON public.product_images FOR UPDATE
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager can delete product images"
  ON public.product_images FOR DELETE
  USING (public.is_admin_or_manager(auth.uid()));

-- 4. Create public storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admin/manager can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin_or_manager(auth.uid()));

-- 6. Service role needs to upload images from edge function - add policy for service role
CREATE POLICY "Service role can manage product images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-images' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'service_role');
