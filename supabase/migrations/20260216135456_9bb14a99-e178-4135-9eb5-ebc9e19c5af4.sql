
-- Add unique constraint for upsert in pims-import edge function
ALTER TABLE public.product_images ADD CONSTRAINT product_images_product_id_storage_path_key UNIQUE (product_id, storage_path);
