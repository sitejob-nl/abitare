
-- Fix SECURITY DEFINER views by recreating with security_invoker = on
CREATE OR REPLACE VIEW v_product_prices_full WITH (security_invoker = on) AS
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

CREATE OR REPLACE VIEW v_price_group_colors WITH (security_invoker = on) AS
SELECT
  pgc.id, pgc.price_group_id, pgc.color_code, pgc.color_name,
  pgc.material_type, pgc.finish, pgc.color_type, pgc.hex_color, pgc.sort_order,
  pg.code AS price_group_code, pg.name AS price_group_name, pg.collection, pg.supplier_id
FROM price_group_colors pgc
JOIN price_groups pg ON pgc.price_group_id = pg.id
WHERE pgc.is_available = true;
