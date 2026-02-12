
-- ============================================================
-- STOSA FIXES: Schema extensions for price groups, colors, prices
-- ============================================================

-- 1. PRICE_GROUPS: Add material metadata
ALTER TABLE price_groups ADD COLUMN IF NOT EXISTS material_type text;
ALTER TABLE price_groups ADD COLUMN IF NOT EXISTS material_description text;
ALTER TABLE price_groups ADD COLUMN IF NOT EXISTS thickness_mm integer;
ALTER TABLE price_groups ADD COLUMN IF NOT EXISTS has_gola_system boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_groups_supplier_code
  ON price_groups(supplier_id, code);

-- 2. PRICE_GROUP_COLORS: Add supplier_id, color_type, hex_color, sort_order
ALTER TABLE price_group_colors ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE price_group_colors ADD COLUMN IF NOT EXISTS color_type text DEFAULT 'front';
ALTER TABLE price_group_colors ADD COLUMN IF NOT EXISTS hex_color text;
ALTER TABLE price_group_colors ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pgc_price_group_type
  ON price_group_colors(price_group_id, color_type) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_pgc_supplier
  ON price_group_colors(supplier_id) WHERE is_available = true;

-- 3. PRODUCT_PRICES: Add price_group_id for direct lookups
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS price_group_id uuid REFERENCES price_groups(id);

CREATE INDEX IF NOT EXISTS idx_pp_product_pricegroup
  ON product_prices(product_id, price_group_id);

-- 4. PRODUCT_RANGES: Index on collection
CREATE INDEX IF NOT EXISTS idx_product_ranges_collection
  ON product_ranges(supplier_id, collection) WHERE is_active = true;

-- 5. PRODUCTS: Unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_supplier_article_unique'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS products_supplier_article_unique
      ON products(supplier_id, article_code);
  END IF;
END $$;

-- 6. VIEWS
CREATE OR REPLACE VIEW v_product_prices_full AS
SELECT
  pp.id AS price_id, pp.product_id, pp.price, pp.price_group_id, pp.range_id,
  pp.variant_2_code, pp.variant_2_name, pp.valid_from, pp.valid_until,
  p.article_code, p.name AS product_name, p.width_mm, p.height_mm, p.depth_mm, p.discount_group,
  pg.code AS price_group_code, pg.name AS price_group_name, pg.collection, pg.material_type,
  s.name AS supplier_name, s.code AS supplier_code, s.price_factor, s.points_to_eur, s.price_system
FROM product_prices pp
JOIN products p ON pp.product_id = p.id
LEFT JOIN price_groups pg ON pp.price_group_id = pg.id
JOIN suppliers s ON p.supplier_id = s.id;

CREATE OR REPLACE VIEW v_price_group_colors AS
SELECT
  pgc.id, pgc.price_group_id, pgc.color_code, pgc.color_name,
  pgc.material_type, pgc.finish, pgc.color_type, pgc.hex_color, pgc.sort_order,
  pg.code AS price_group_code, pg.name AS price_group_name, pg.collection, pg.supplier_id
FROM price_group_colors pgc
JOIN price_groups pg ON pgc.price_group_id = pg.id
WHERE pgc.is_available = true;

-- 7. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_product_price(p_product_id uuid, p_price_group_id uuid)
RETURNS numeric AS $$
DECLARE result numeric;
BEGIN
  SELECT price INTO result FROM product_prices
  WHERE product_id = p_product_id AND price_group_id = p_price_group_id LIMIT 1;
  IF result IS NOT NULL THEN RETURN result; END IF;
  SELECT pp.price INTO result FROM product_prices pp
  JOIN product_ranges pr ON pp.range_id = pr.id
  JOIN price_groups pg ON pg.id = p_price_group_id
  WHERE pp.product_id = p_product_id AND pg.code = ANY(pr.available_price_groups) LIMIT 1;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION calc_selling_price(p_catalog_price numeric, p_supplier_id uuid)
RETURNS numeric AS $$
DECLARE v_price_system text; v_points_to_eur numeric; v_price_factor numeric; v_result numeric;
BEGIN
  SELECT price_system, points_to_eur, price_factor INTO v_price_system, v_points_to_eur, v_price_factor
  FROM suppliers WHERE id = p_supplier_id;
  IF v_price_system = 'points' AND v_points_to_eur IS NOT NULL THEN
    v_result := p_catalog_price * v_points_to_eur * COALESCE(v_price_factor, 1.0);
  ELSE
    v_result := p_catalog_price * COALESCE(v_price_factor, 1.0);
  END IF;
  RETURN ROUND(v_result, 2);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 8. BACKFILL existing product_prices with price_group_id
UPDATE product_prices pp
SET price_group_id = pg.id
FROM product_ranges pr, price_groups pg
WHERE pp.range_id = pr.id
  AND pp.price_group_id IS NULL
  AND pr.available_price_groups IS NOT NULL
  AND array_length(pr.available_price_groups, 1) > 0
  AND pg.supplier_id = pr.supplier_id
  AND pg.code = pr.available_price_groups[1];
