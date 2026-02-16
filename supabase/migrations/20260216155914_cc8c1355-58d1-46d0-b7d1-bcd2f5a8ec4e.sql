INSERT INTO public.suppliers (name, code, is_active, price_factor, price_system, pims_aliases)
VALUES ('Gaggenau', 'GAGGENAU', true, 1.0, 'currency', ARRAY['Gaggenau']::text[])
ON CONFLICT (code) DO NOTHING;