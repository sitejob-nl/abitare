-- Fix security definer views → set to SECURITY INVOKER
ALTER VIEW products_full SET (security_invoker = on);
ALTER VIEW products_by_width SET (security_invoker = on);
ALTER VIEW kitchen_config_options SET (security_invoker = on);

-- Fix function search_path warnings
ALTER FUNCTION get_matching_products_by_width(UUID, INTEGER, TEXT[]) SET search_path = public;
ALTER FUNCTION calculate_product_price(UUID, UUID, DECIMAL, DECIMAL, DECIMAL) SET search_path = public;
ALTER FUNCTION get_related_products(UUID) SET search_path = public;
ALTER FUNCTION update_discount_groups_timestamp() SET search_path = public;