
-- Update STOSA supplier to use price_groups system
UPDATE public.suppliers 
SET has_price_groups = true, price_system = 'price_groups'
WHERE code = 'STOSA';

-- Seed Evolution price groups for STOSA
INSERT INTO public.price_groups (supplier_id, code, name, collection, sort_order, is_glass)
SELECT 
  s.id, pg.code, pg.name, 'evolution', pg.sort_order, pg.is_glass
FROM public.suppliers s
CROSS JOIN (VALUES
  ('E1', 'Prijsgroep E1 - Termo Strutturato basis', 1, false),
  ('E2', 'Prijsgroep E2 - PET/Laminato/Termo', 2, false),
  ('E3', 'Prijsgroep E3 - Laccato/PET Millerighe', 3, false),
  ('E4', 'Prijsgroep E4 - Fenix', 4, false),
  ('E5', 'Prijsgroep E5 - Legno Frassino', 5, false),
  ('E6', 'Prijsgroep E6 - Laccato opaco', 6, false),
  ('E7', 'Prijsgroep E7 - Impiallacciato/Legno Rovere', 7, false),
  ('E8', 'Prijsgroep E8 - Laccato lucido/Deluxe', 8, false),
  ('E9', 'Prijsgroep E9 - Impiallacciato premium', 9, false),
  ('E10', 'Prijsgroep E10 - Cannettato/Doghe', 10, false),
  ('A', 'Glas A - Vetro Lucido', 11, true),
  ('B', 'Glas B - Vetro Satinato', 12, true),
  ('C', 'Glas C - HPL/Neolith', 13, true)
) AS pg(code, name, sort_order, is_glass)
WHERE s.code = 'STOSA'
ON CONFLICT (supplier_id, code, collection) DO NOTHING;
