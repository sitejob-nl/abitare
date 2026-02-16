-- Move the 443 Gaggenau products from Bosch to Gaggenau supplier
UPDATE public.products 
SET supplier_id = 'b27b9c22-12ec-41e5-a9ef-883b946a6a71'
WHERE supplier_id = 'e70c4a1a-b3e1-460b-86b6-be9644eaaf56'
  AND pims_last_synced >= '2026-02-16 15:47:00';

-- Also update the import log entry
UPDATE public.import_logs
SET supplier_id = 'b27b9c22-12ec-41e5-a9ef-883b946a6a71'
WHERE id = '0cf986ae-80e8-499a-82f3-98782297d1a9';

-- Update pims_image_queue entries too
UPDATE public.pims_image_queue
SET supplier_id = 'b27b9c22-12ec-41e5-a9ef-883b946a6a71'
WHERE supplier_id = 'e70c4a1a-b3e1-460b-86b6-be9644eaaf56'
  AND created_at >= '2026-02-16 15:47:00';