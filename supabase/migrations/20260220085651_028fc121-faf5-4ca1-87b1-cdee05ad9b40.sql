
-- STOSA Prijsgroepen Systeem - Database Migration (v2)
-- Constraint products_supplier_article_unique bestaat al, overslaan

-- 2. Unique constraint op price_groups (supplier_id, code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'price_groups_supplier_code_unique'
  ) THEN
    ALTER TABLE price_groups 
    ADD CONSTRAINT price_groups_supplier_code_unique 
    UNIQUE (supplier_id, code);
  END IF;
END $$;

-- 3. Unique constraint op product_prices (product_id, price_group_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_prices_product_pricegroup_unique'
  ) THEN
    DELETE FROM product_prices a
    USING product_prices b
    WHERE a.id < b.id 
      AND a.product_id = b.product_id 
      AND a.price_group_id = b.price_group_id;
    
    ALTER TABLE product_prices 
    ADD CONSTRAINT product_prices_product_pricegroup_unique 
    UNIQUE (product_id, price_group_id);
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup 
ON product_prices (product_id, price_group_id);

CREATE INDEX IF NOT EXISTS idx_product_prices_price_group 
ON product_prices (price_group_id);

CREATE INDEX IF NOT EXISTS idx_price_groups_supplier 
ON price_groups (supplier_id);

CREATE INDEX IF NOT EXISTS idx_products_supplier_article 
ON products (supplier_id, article_code);

-- 5. Helper function: get_product_price
CREATE OR REPLACE FUNCTION get_product_price(
  p_product_id UUID,
  p_price_group_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  SELECT price INTO v_price
  FROM product_prices
  WHERE product_id = p_product_id
    AND price_group_id = p_price_group_id
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY valid_from DESC
  LIMIT 1;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

-- 6. Helper function: get_product_price_by_code
CREATE OR REPLACE FUNCTION get_product_price_by_code(
  p_supplier_id UUID,
  p_article_code TEXT,
  p_price_group_code TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  SELECT pp.price INTO v_price
  FROM product_prices pp
  JOIN products p ON p.id = pp.product_id
  JOIN price_groups pg ON pg.id = pp.price_group_id
  WHERE p.supplier_id = p_supplier_id
    AND p.article_code = p_article_code
    AND pg.code = p_price_group_code
    AND (pp.valid_until IS NULL OR pp.valid_until >= CURRENT_DATE)
  ORDER BY pp.valid_from DESC
  LIMIT 1;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

-- 7. View: products_with_price_groups
CREATE OR REPLACE VIEW products_with_price_groups AS
SELECT 
  p.id,
  p.article_code,
  p.name,
  p.supplier_id,
  s.name as supplier_name,
  pg.id as price_group_id,
  pg.code as price_group_code,
  pg.name as price_group_name,
  pg.is_glass,
  pp.price,
  pp.valid_from
FROM products p
JOIN suppliers s ON s.id = p.supplier_id
JOIN product_prices pp ON pp.product_id = p.id
JOIN price_groups pg ON pg.id = pp.price_group_id
WHERE p.is_active = true
  AND (pp.valid_until IS NULL OR pp.valid_until >= CURRENT_DATE);

-- 8. Trigger: Auto-update updated_at on products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION get_product_price TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_price_by_code TO authenticated;
