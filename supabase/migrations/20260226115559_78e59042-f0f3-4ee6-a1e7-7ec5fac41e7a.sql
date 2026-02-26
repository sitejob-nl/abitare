
CREATE OR REPLACE FUNCTION public.get_products_for_price_group(
  p_price_group_id uuid,
  p_search text DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_show_inactive boolean DEFAULT false,
  p_sort_field text DEFAULT 'name',
  p_sort_dir text DEFAULT 'asc',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  article_code varchar,
  name text,
  sku varchar,
  description text,
  base_price numeric,
  cost_price numeric,
  book_price numeric,
  width_mm integer,
  height_mm integer,
  depth_mm integer,
  is_active boolean,
  pricing_unit public.pricing_unit,
  kitchen_group varchar,
  type_code varchar,
  type_name_nl varchar,
  supplier_id uuid,
  supplier_name text,
  supplier_code varchar,
  category_id uuid,
  category_name text,
  category_code varchar,
  price_group_price numeric,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
BEGIN
  -- Count total matching rows first
  SELECT COUNT(DISTINCT p.id) INTO v_total
  FROM products p
  INNER JOIN product_prices pp ON pp.product_id = p.id AND pp.price_group_id = p_price_group_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  WHERE (p_show_inactive OR p.is_active = true)
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_search IS NULL OR p_search = '' OR
         p.article_code ILIKE '%' || p_search || '%' OR
         p.name ILIKE '%' || p_search || '%' OR
         p.sku ILIKE '%' || p_search || '%')
    AND (p_price_min IS NULL OR p.base_price >= p_price_min)
    AND (p_price_max IS NULL OR p.base_price <= p_price_max);

  RETURN QUERY
  SELECT
    p.id,
    p.article_code,
    p.name,
    p.sku,
    p.description,
    p.base_price,
    p.cost_price,
    p.book_price,
    p.width_mm,
    p.height_mm,
    p.depth_mm,
    p.is_active,
    p.pricing_unit,
    p.kitchen_group,
    p.type_code,
    p.type_name_nl,
    p.supplier_id,
    s.name AS supplier_name,
    s.code AS supplier_code,
    p.category_id,
    pc.name AS category_name,
    pc.code AS category_code,
    pp.price AS price_group_price,
    v_total AS total_count
  FROM products p
  INNER JOIN product_prices pp ON pp.product_id = p.id AND pp.price_group_id = p_price_group_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  WHERE (p_show_inactive OR p.is_active = true)
    AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_search IS NULL OR p_search = '' OR
         p.article_code ILIKE '%' || p_search || '%' OR
         p.name ILIKE '%' || p_search || '%' OR
         p.sku ILIKE '%' || p_search || '%')
    AND (p_price_min IS NULL OR p.base_price >= p_price_min)
    AND (p_price_max IS NULL OR p.base_price <= p_price_max)
  ORDER BY
    CASE WHEN p_sort_dir = 'asc' THEN
      CASE p_sort_field
        WHEN 'name' THEN p.name
        WHEN 'article_code' THEN p.article_code::text
        ELSE p.name
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_dir = 'desc' THEN
      CASE p_sort_field
        WHEN 'name' THEN p.name
        WHEN 'article_code' THEN p.article_code::text
        ELSE p.name
      END
    END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'base_price' AND p_sort_dir = 'asc' THEN p.base_price END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'base_price' AND p_sort_dir = 'desc' THEN p.base_price END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'cost_price' AND p_sort_dir = 'asc' THEN p.cost_price END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'cost_price' AND p_sort_dir = 'desc' THEN p.cost_price END DESC NULLS LAST,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_dir = 'asc' THEN p.created_at END ASC NULLS LAST,
    CASE WHEN p_sort_field = 'created_at' AND p_sort_dir = 'desc' THEN p.created_at END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
