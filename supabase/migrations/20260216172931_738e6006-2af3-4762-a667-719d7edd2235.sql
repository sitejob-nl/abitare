
-- Stap 1: Insert product_images via een deduplicated CTE
WITH ranked AS (
  SELECT DISTINCT ON (product_id, 'url-ref/' || supplier_id || '/' || article_code || '/' || COALESCE(media_type, 'photo') || '-' || image_index)
    product_id, image_url, supplier_id, article_code, media_type, image_index
  FROM pims_image_queue
  WHERE status IN ('pending', 'processing')
  ORDER BY product_id, 'url-ref/' || supplier_id || '/' || article_code || '/' || COALESCE(media_type, 'photo') || '-' || image_index, created_at DESC
)
INSERT INTO product_images (product_id, url, storage_path, type, media_type, sort_order, source)
SELECT product_id, image_url,
       'url-ref/' || supplier_id || '/' || article_code || '/' || COALESCE(media_type, 'photo') || '-' || image_index,
       CASE WHEN COALESCE(media_type, 'photo') = 'photo' AND image_index = 0 THEN 'main'
            WHEN COALESCE(media_type, 'photo') = 'photo' THEN 'detail'
            ELSE COALESCE(media_type, 'photo') END,
       COALESCE(media_type, 'photo'), image_index, 'pims'
FROM ranked
ON CONFLICT (product_id, storage_path) DO UPDATE SET url = EXCLUDED.url;

-- Stap 2: Update products.image_url voor hoofdfoto's
UPDATE products SET image_url = sub.image_url
FROM (
  SELECT DISTINCT ON (product_id) product_id, image_url
  FROM pims_image_queue
  WHERE status IN ('pending','processing')
    AND COALESCE(media_type,'photo') = 'photo' AND image_index = 0
  ORDER BY product_id, created_at DESC
) sub
WHERE products.id = sub.product_id
  AND NOT COALESCE((products.user_override->>'image_url')::boolean, false);

-- Stap 3: Alles op done zetten
UPDATE pims_image_queue SET status = 'done', processed_at = NOW()
WHERE status IN ('pending', 'processing');
