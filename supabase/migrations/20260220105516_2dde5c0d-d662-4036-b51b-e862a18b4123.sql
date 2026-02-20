
CREATE OR REPLACE FUNCTION public.bulk_adjust_price(p_ids UUID[], p_factor NUMERIC)
RETURNS void AS $$
  UPDATE public.products
  SET base_price = ROUND(base_price * p_factor, 2)
  WHERE id = ANY(p_ids) AND base_price IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
