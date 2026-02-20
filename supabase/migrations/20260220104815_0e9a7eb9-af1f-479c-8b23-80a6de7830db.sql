
CREATE OR REPLACE FUNCTION public.get_products_by_price_group(p_price_group_id UUID)
RETURNS SETOF UUID AS $$
  SELECT DISTINCT product_id 
  FROM public.product_prices 
  WHERE price_group_id = p_price_group_id
    AND product_id IS NOT NULL
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public;
