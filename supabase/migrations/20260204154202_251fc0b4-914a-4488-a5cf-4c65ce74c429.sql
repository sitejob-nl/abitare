-- Create installer_orders view (excludes all financial data)
CREATE OR REPLACE VIEW public.installer_orders AS
SELECT 
  id,
  order_number,
  customer_id,
  quote_id,
  division_id,
  status,
  order_date,
  expected_delivery_date,
  actual_delivery_date,
  expected_installation_date,
  actual_installation_date,
  delivery_method,
  requires_elevator,
  delivery_notes,
  salesperson_id,
  assistant_id,
  installer_id,
  customer_notes,
  created_by,
  created_at,
  updated_at
FROM public.orders
WHERE installer_id = auth.uid()
  AND status IN ('montage_gepland', 'geleverd');

-- Create installer_order_lines view (excludes pricing data)
CREATE OR REPLACE VIEW public.installer_order_lines AS
SELECT 
  ol.id,
  ol.order_id,
  ol.product_id,
  ol.supplier_id,
  ol.article_code,
  ol.description,
  ol.quantity,
  ol.unit,
  ol.is_ordered,
  ol.ordered_at,
  ol.expected_delivery,
  ol.is_delivered,
  ol.delivered_at,
  ol.configuration,
  ol.section_type,
  ol.is_group_header,
  ol.group_title,
  ol.sort_order,
  ol.section_id,
  ol.quote_line_id
FROM public.order_lines ol
WHERE EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = ol.order_id 
    AND o.installer_id = auth.uid()
    AND o.status IN ('montage_gepland', 'geleverd')
);

-- Grant access to authenticated users
GRANT SELECT ON public.installer_orders TO authenticated;
GRANT SELECT ON public.installer_order_lines TO authenticated;