
-- Add pims_aliases column to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS pims_aliases text[] DEFAULT '{}';

-- Insert Bosch supplier with aliases
INSERT INTO public.suppliers (name, code, is_active, pims_aliases)
VALUES ('Bosch', 'BOSCH', true, ARRAY['BSH Huishoudapparaten', 'BSH', 'Bosch'])
ON CONFLICT DO NOTHING;
