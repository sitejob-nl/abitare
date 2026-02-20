
-- Add forecast_week column to orders
ALTER TABLE public.orders ADD COLUMN forecast_week text;
-- Comment for clarity
COMMENT ON COLUMN public.orders.forecast_week IS 'Internal forecast week for planning, format YYYY-Wnn (e.g. 2026-W12). Not linked to Outlook.';

-- Update installer_orders view with 7-day window filter
CREATE OR REPLACE VIEW public.installer_orders AS
SELECT id,
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
FROM orders
WHERE installer_id = auth.uid()
  AND status = ANY (ARRAY['montage_gepland'::order_status, 'geleverd'::order_status])
  AND (
    expected_installation_date IS NULL
    OR expected_installation_date <= CURRENT_DATE + INTERVAL '7 days'
  );

-- Update installer_order_lines view to match the same filter
CREATE OR REPLACE VIEW public.installer_order_lines AS
SELECT ol.id,
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
FROM order_lines ol
WHERE (EXISTS ( SELECT 1
           FROM orders o
          WHERE o.id = ol.order_id 
            AND o.installer_id = auth.uid() 
            AND (o.status = ANY (ARRAY['montage_gepland'::order_status, 'geleverd'::order_status]))
            AND (
              o.expected_installation_date IS NULL
              OR o.expected_installation_date <= CURRENT_DATE + INTERVAL '7 days'
            )
      ));
