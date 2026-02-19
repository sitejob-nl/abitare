
-- Insert gemonteerd order for Peter van den Berg
INSERT INTO public.orders (customer_id, status, actual_installation_date, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code)
SELECT c.id, 'gemonteerd', CURRENT_DATE - interval '7 days', CURRENT_DATE - interval '7 days', CURRENT_DATE - interval '14 days', false, c.delivery_street_address, c.delivery_city, c.delivery_postal_code
FROM public.customers c WHERE c.last_name = 'van den Berg' AND c.first_name = 'Peter' LIMIT 1;

-- Insert geleverd order for Sophie Mulder (not yet inserted)
INSERT INTO public.orders (customer_id, status, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code)
SELECT c.id, 'geleverd', CURRENT_DATE + interval '10 days', CURRENT_DATE - interval '2 days', true, c.delivery_street_address, c.delivery_city, c.delivery_postal_code
FROM public.customers c WHERE c.last_name = 'Mulder' AND c.first_name = 'Sophie' LIMIT 1;
