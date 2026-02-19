
-- Insert mock customers with division
INSERT INTO public.customers (first_name, last_name, company_name, city, postal_code, street_address, email, phone, delivery_city, delivery_postal_code, delivery_street_address, delivery_floor, division_id)
VALUES
  ('Jan', 'de Vries', NULL, 'Amsterdam', '1012AB', 'Keizersgracht 123', 'jan@devries.nl', '0612345678', 'Amsterdam', '1012AB', 'Keizersgracht 123', '2', '22222222-2222-2222-2222-222222222222'),
  ('Maria', 'Bakker', NULL, 'Rotterdam', '3011AA', 'Coolsingel 45', 'maria@bakker.nl', '0623456789', 'Rotterdam', '3011AA', 'Coolsingel 45', NULL, '22222222-2222-2222-2222-222222222222'),
  (NULL, 'Jansen', 'Jansen Keukens BV', 'Utrecht', '3512JC', 'Oudegracht 88', 'info@jansenkeukens.nl', '0301234567', 'Utrecht', '3512JC', 'Oudegracht 88', '1', '22222222-2222-2222-2222-222222222222'),
  ('Peter', 'van den Berg', NULL, 'Den Haag', '2511AB', 'Lange Voorhout 10', 'peter@vandenberg.nl', '0634567890', 'Den Haag', '2511AB', 'Lange Voorhout 10', '3', '22222222-2222-2222-2222-222222222222'),
  ('Sophie', 'Mulder', NULL, 'Eindhoven', '5611AB', 'Stratumseind 22', 'sophie@mulder.nl', '0645678901', 'Eindhoven', '5611AB', 'Stratumseind 22', NULL, '22222222-2222-2222-2222-222222222222');

-- Insert montage orders with kas as installer
INSERT INTO public.orders (customer_id, status, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code, division_id, installer_id)
SELECT c.id, 'montage_gepland', CURRENT_DATE + 2, CURRENT_DATE - 3, false, 'Keizersgracht 123', 'Amsterdam', '1012AB', '22222222-2222-2222-2222-222222222222', '7dae8a4c-08e4-4505-b078-2cb5d8752ce2'
FROM public.customers c WHERE c.last_name = 'de Vries' AND c.first_name = 'Jan' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.orders (customer_id, status, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code, division_id, installer_id)
SELECT c.id, 'montage_gepland', CURRENT_DATE + 5, CURRENT_DATE - 1, true, 'Coolsingel 45', 'Rotterdam', '3011AA', '22222222-2222-2222-2222-222222222222', '7dae8a4c-08e4-4505-b078-2cb5d8752ce2'
FROM public.customers c WHERE c.last_name = 'Bakker' AND c.first_name = 'Maria' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.orders (customer_id, status, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code, division_id, installer_id)
SELECT c.id, 'montage_gepland', CURRENT_DATE, CURRENT_DATE - 5, false, 'Oudegracht 88', 'Utrecht', '3512JC', '22222222-2222-2222-2222-222222222222', '7dae8a4c-08e4-4505-b078-2cb5d8752ce2'
FROM public.customers c WHERE c.last_name = 'Jansen' AND c.company_name = 'Jansen Keukens BV' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.orders (customer_id, status, actual_installation_date, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code, division_id, installer_id)
SELECT c.id, 'gemonteerd', CURRENT_DATE - 7, CURRENT_DATE - 7, CURRENT_DATE - 14, false, 'Lange Voorhout 10', 'Den Haag', '2511AB', '22222222-2222-2222-2222-222222222222', '7dae8a4c-08e4-4505-b078-2cb5d8752ce2'
FROM public.customers c WHERE c.last_name = 'van den Berg' AND c.first_name = 'Peter' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.orders (customer_id, status, expected_installation_date, expected_delivery_date, requires_elevator, installation_street_address, installation_city, installation_postal_code, division_id, installer_id)
SELECT c.id, 'geleverd', CURRENT_DATE + 10, CURRENT_DATE - 2, true, 'Stratumseind 22', 'Eindhoven', '5611AB', '22222222-2222-2222-2222-222222222222', '7dae8a4c-08e4-4505-b078-2cb5d8752ce2'
FROM public.customers c WHERE c.last_name = 'Mulder' AND c.first_name = 'Sophie' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;
