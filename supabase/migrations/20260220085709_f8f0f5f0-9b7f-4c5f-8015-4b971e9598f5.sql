
-- Fix security warnings from STOSA migration

-- Fix view: set security_invoker
ALTER VIEW products_with_price_groups SET (security_invoker = on);

-- Fix functions: set search_path
CREATE OR REPLACE FUNCTION get_product_price(
  p_product_id UUID,
  p_price_group_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
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

CREATE OR REPLACE FUNCTION get_product_price_by_code(
  p_supplier_id UUID,
  p_article_code TEXT,
  p_price_group_code TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
