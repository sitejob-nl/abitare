-- ============================================================
-- STOSA Import System v5 - Database Migration
-- ============================================================

-- ══════════════════════════════════════════════════════════
-- DISCOUNT GROUPS TABLE
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discount_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  default_discount_percent DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, code)
);

CREATE INDEX IF NOT EXISTS idx_discount_groups_supplier 
  ON discount_groups(supplier_id);

-- RLS for discount_groups
ALTER TABLE discount_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discount_groups_select" ON discount_groups
  FOR SELECT USING (true);

CREATE POLICY "discount_groups_insert" ON discount_groups
  FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "discount_groups_update" ON discount_groups
  FOR UPDATE USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "discount_groups_delete" ON discount_groups
  FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- ══════════════════════════════════════════════════════════
-- PRODUCT CATEGORIES - Add kitchen_group
-- ══════════════════════════════════════════════════════════

ALTER TABLE product_categories 
  ADD COLUMN IF NOT EXISTS kitchen_group VARCHAR(50);

-- ══════════════════════════════════════════════════════════
-- PRODUCTS - Add new columns
-- ══════════════════════════════════════════════════════════

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_unit') THEN
    CREATE TYPE pricing_unit AS ENUM ('STUK', 'ML', 'M2', 'SET');
  END IF;
END $$;

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS pricing_unit pricing_unit DEFAULT 'STUK';

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS discount_group_id UUID REFERENCES discount_groups(id);

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS type_code VARCHAR(10);

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS type_name_nl VARCHAR(100);

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50);

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS kitchen_group VARCHAR(50);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_pricing_unit ON products(pricing_unit);
CREATE INDEX IF NOT EXISTS idx_products_discount_group ON products(discount_group_id);
CREATE INDEX IF NOT EXISTS idx_products_type_code ON products(type_code);
CREATE INDEX IF NOT EXISTS idx_products_kitchen_group ON products(kitchen_group);
CREATE INDEX IF NOT EXISTS idx_products_width ON products(width_mm);

-- ══════════════════════════════════════════════════════════
-- IMPORT LOGS - Add metadata column
-- ══════════════════════════════════════════════════════════

ALTER TABLE import_logs 
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ══════════════════════════════════════════════════════════
-- HELPER VIEWS
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW products_full AS
SELECT 
  p.*,
  pc.name AS category_name,
  pc.code AS category_code,
  pc.kitchen_group AS category_kitchen_group,
  dg.code AS discount_group_code,
  dg.name AS discount_group_name,
  dg.default_discount_percent,
  s.name AS supplier_name
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN discount_groups dg ON p.discount_group_id = dg.id
LEFT JOIN suppliers s ON p.supplier_id = s.id;

CREATE OR REPLACE VIEW products_by_width AS
SELECT 
  supplier_id,
  width_mm,
  kitchen_group,
  type_code,
  type_name_nl,
  COUNT(*) as product_count,
  MIN(
    (SELECT MIN(pp.price) FROM product_prices pp WHERE pp.product_id = products.id)
  ) as min_price,
  MAX(
    (SELECT MAX(pp.price) FROM product_prices pp WHERE pp.product_id = products.id)
  ) as max_price
FROM products
WHERE width_mm IS NOT NULL
GROUP BY supplier_id, width_mm, kitchen_group, type_code, type_name_nl
ORDER BY width_mm, kitchen_group, type_code;

CREATE OR REPLACE VIEW kitchen_config_options AS
SELECT DISTINCT
  p.supplier_id,
  p.kitchen_group,
  p.type_code,
  p.type_name_nl,
  p.width_mm,
  p.pricing_unit,
  COUNT(DISTINCT p.id) as variants,
  MIN(pp.price) as min_price,
  MAX(pp.price) as max_price
FROM products p
LEFT JOIN product_prices pp ON pp.product_id = p.id
WHERE p.kitchen_group IS NOT NULL
GROUP BY 
  p.supplier_id, p.kitchen_group, p.type_code, p.type_name_nl, p.width_mm, p.pricing_unit
ORDER BY p.kitchen_group, p.width_mm, p.type_code;

-- ══════════════════════════════════════════════════════════
-- FUNCTIONS
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_matching_products_by_width(
  _supplier_id UUID,
  _width_mm INTEGER,
  _kitchen_groups TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  article_code VARCHAR,
  name TEXT,
  type_code VARCHAR,
  type_name_nl VARCHAR,
  kitchen_group VARCHAR,
  pricing_unit pricing_unit,
  min_price DECIMAL,
  max_price DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.article_code,
    p.name,
    p.type_code,
    p.type_name_nl,
    p.kitchen_group,
    p.pricing_unit,
    MIN(pp.price) as min_price,
    MAX(pp.price) as max_price
  FROM products p
  LEFT JOIN product_prices pp ON pp.product_id = p.id
  WHERE p.supplier_id = _supplier_id
    AND p.width_mm = _width_mm
    AND (_kitchen_groups IS NULL OR p.kitchen_group = ANY(_kitchen_groups))
  GROUP BY p.id, p.article_code, p.name, p.type_code, p.type_name_nl, p.kitchen_group, p.pricing_unit
  ORDER BY p.kitchen_group, p.type_code;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_product_price(
  _product_id UUID,
  _price_group_id UUID,
  _quantity DECIMAL,
  _length_mm DECIMAL DEFAULT NULL,
  _area_m2 DECIMAL DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  _unit pricing_unit;
  _base_price DECIMAL;
  _total_price DECIMAL;
BEGIN
  SELECT p.pricing_unit, pp.price
  INTO _unit, _base_price
  FROM products p
  JOIN product_prices pp ON pp.product_id = p.id
  WHERE p.id = _product_id
    AND pp.price_group_id = _price_group_id;
  
  IF _base_price IS NULL THEN
    SELECT p.pricing_unit, pp.price
    INTO _unit, _base_price
    FROM products p
    JOIN product_prices pp ON pp.product_id = p.id
    WHERE p.id = _product_id
    LIMIT 1;
  END IF;
  
  IF _base_price IS NULL THEN RETURN NULL; END IF;
  
  CASE _unit
    WHEN 'STUK' THEN _total_price := _base_price * _quantity;
    WHEN 'ML' THEN
      IF _length_mm IS NOT NULL THEN
        _total_price := _base_price * (_length_mm / 1000.0) * _quantity;
      ELSE _total_price := _base_price * _quantity;
      END IF;
    WHEN 'M2' THEN
      IF _area_m2 IS NOT NULL THEN
        _total_price := _base_price * _area_m2 * _quantity;
      ELSE _total_price := _base_price * _quantity;
      END IF;
    WHEN 'SET' THEN _total_price := _base_price * _quantity;
    ELSE _total_price := _base_price * _quantity;
  END CASE;
  
  RETURN ROUND(_total_price, 2);
END;
$$;

CREATE OR REPLACE FUNCTION get_related_products(_product_id UUID)
RETURNS TABLE (
  product_id UUID,
  article_code VARCHAR,
  name TEXT,
  type_code VARCHAR,
  type_name_nl VARCHAR,
  kitchen_group VARCHAR,
  relation_type TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  _supplier_id UUID;
  _width_mm INTEGER;
  _kitchen_group VARCHAR;
BEGIN
  SELECT p.supplier_id, p.width_mm, p.kitchen_group
  INTO _supplier_id, _width_mm, _kitchen_group
  FROM products p WHERE p.id = _product_id;
  
  RETURN QUERY
  SELECT 
    p.id, p.article_code, p.name, p.type_code, p.type_name_nl, p.kitchen_group,
    CASE 
      WHEN p.kitchen_group = _kitchen_group THEN 'same_group'
      WHEN p.width_mm = _width_mm THEN 'same_width'
      ELSE 'other'
    END as relation_type
  FROM products p
  WHERE p.supplier_id = _supplier_id
    AND p.id != _product_id
    AND (p.width_mm = _width_mm OR p.kitchen_group = _kitchen_group)
  ORDER BY 
    CASE WHEN p.width_mm = _width_mm AND p.kitchen_group = _kitchen_group THEN 1
         WHEN p.width_mm = _width_mm THEN 2
         WHEN p.kitchen_group = _kitchen_group THEN 3
         ELSE 4
    END,
    p.kitchen_group, p.type_code
  LIMIT 50;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_discount_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_discount_groups_updated ON discount_groups;
CREATE TRIGGER tr_discount_groups_updated
  BEFORE UPDATE ON discount_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_groups_timestamp();