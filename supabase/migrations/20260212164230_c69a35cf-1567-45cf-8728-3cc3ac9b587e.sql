
-- Update Stosa supplier settings
UPDATE suppliers SET has_price_groups = true, price_system = 'points' WHERE id = '29a8e1aa-35da-4784-99ff-23129f36fe22';

-- Update Evolution price groups with material metadata
UPDATE price_groups SET material_type = 'laminato', material_description = 'Laminaat met houtstructuur, termo geperst', thickness_mm = 23, has_gola_system = true WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E1';
UPDATE price_groups SET material_type = 'nobilitato', material_description = 'Edel gelamineerd oppervlak, mat chic afwerking', thickness_mm = 23, has_gola_system = true WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E2';
UPDATE price_groups SET material_type = 'laminato', material_description = 'Standaard laminaat afwerking', thickness_mm = 23, has_gola_system = true WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E3';
UPDATE price_groups SET material_type = 'hpl', material_description = 'High Pressure Laminate en Fenix NTM oppervlak', thickness_mm = 23, has_gola_system = true WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E4';
UPDATE price_groups SET material_type = 'pet', material_description = 'PET folie, mat oppervlak', thickness_mm = 25, has_gola_system = true WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E5';
UPDATE price_groups SET material_type = 'alkorcell', material_description = 'Alkorcell gecoat oppervlak', thickness_mm = 23, has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E6';
UPDATE price_groups SET material_type = 'laccato', material_description = 'Gelakt oppervlak, mat of hoogglans', thickness_mm = 23, has_gola_system = true WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E7';
UPDATE price_groups SET material_type = 'pet', material_description = 'PET folie, hoogglans oppervlak', thickness_mm = 25, has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E8';
UPDATE price_groups SET material_type = 'vetro', material_description = 'Glad of mat glas oppervlak', thickness_mm = 23, has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E9';
UPDATE price_groups SET material_type = 'vetro', material_description = 'Glas met kaderwerk', thickness_mm = 23, has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'E10';
UPDATE price_groups SET material_type = 'legno', material_description = 'Massief hout', has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'A';
UPDATE price_groups SET material_type = 'legno_laccato', material_description = 'Massief hout gecombineerd met lak', has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'B';
UPDATE price_groups SET material_type = 'legno', material_description = 'Hout met noesten (rustiek)', has_gola_system = false WHERE supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND code = 'C';

-- Insert ART price groups
INSERT INTO price_groups (supplier_id, code, name, collection, material_type, material_description, thickness_mm, has_gola_system, is_glass, sort_order)
VALUES
  ('29a8e1aa-35da-4784-99ff-23129f36fe22', 'I',   'Nobilitato Matt Chic',   'art', 'nobilitato', 'Edel gelamineerd, mat chic - Kaya', 23, false, false, 20),
  ('29a8e1aa-35da-4784-99ff-23129f36fe22', 'II',  'Cemento Materico',        'art', 'cemento', 'Cement look materiaal - Kaya', 23, false, false, 21),
  ('29a8e1aa-35da-4784-99ff-23129f36fe22', 'III', 'Termo Strutturato',       'art', 'laminato', 'Houtstructuur laminaat - Sveva/Lumia', 23, false, false, 22),
  ('29a8e1aa-35da-4784-99ff-23129f36fe22', 'IV',  'Ossido Materico',         'art', 'ossido', 'Geoxideerd materiaal look - Lumia', 23, false, false, 23),
  ('29a8e1aa-35da-4784-99ff-23129f36fe22', 'V',   'Alkorcell',               'art', 'alkorcell', 'Alkorcell gecoat - Lumia', 23, false, false, 24)
ON CONFLICT (supplier_id, code) DO UPDATE SET
  name = EXCLUDED.name, collection = EXCLUDED.collection, material_type = EXCLUDED.material_type,
  material_description = EXCLUDED.material_description, thickness_mm = EXCLUDED.thickness_mm,
  has_gola_system = EXCLUDED.has_gola_system, is_glass = EXCLUDED.is_glass, sort_order = EXCLUDED.sort_order;

-- Insert front colors for E1
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, finish, color_type, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', c.color_code, c.color_name, c.material_type, c.finish, c.color_type, c.sort_order
FROM price_groups pg
CROSS JOIN (VALUES
  ('OLS', 'Olmo Scuro', 'termo_strutturato', 'strutturato', 'front', 1),
  ('OLC', 'Olmo Chiaro', 'termo_strutturato', 'strutturato', 'front', 2),
  ('ROV', 'Rovere Naturale', 'termo_strutturato', 'strutturato', 'front', 3),
  ('NOC', 'Noce', 'termo_strutturato', 'strutturato', 'front', 4),
  ('CAS', 'Castagno', 'termo_strutturato', 'strutturato', 'front', 5),
  ('TKN', 'Teak Naturale', 'termo_strutturato', 'strutturato', 'front', 6)
) AS c(color_code, color_name, material_type, finish, color_type, sort_order)
WHERE pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND pg.code = 'E1'
ON CONFLICT DO NOTHING;

-- Insert front colors for E2
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, finish, color_type, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', c.color_code, c.color_name, c.material_type, c.finish, c.color_type, c.sort_order
FROM price_groups pg
CROSS JOIN (VALUES
  ('BIA', 'Bianco', 'nobilitato', 'matt_chic', 'front', 1),
  ('GRC', 'Grigio Chiaro', 'nobilitato', 'matt_chic', 'front', 2),
  ('GRS', 'Grigio Scuro', 'nobilitato', 'matt_chic', 'front', 3),
  ('NER', 'Nero', 'nobilitato', 'matt_chic', 'front', 4),
  ('SAB', 'Sabbia', 'nobilitato', 'matt_chic', 'front', 5),
  ('CRE', 'Crema', 'nobilitato', 'matt_chic', 'front', 6)
) AS c(color_code, color_name, material_type, finish, color_type, sort_order)
WHERE pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND pg.code = 'E2'
ON CONFLICT DO NOTHING;

-- Insert front colors for E4
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, finish, color_type, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', c.color_code, c.color_name, c.material_type, c.finish, c.color_type, c.sort_order
FROM price_groups pg
CROSS JOIN (VALUES
  ('FBN', 'Fenix Bianco Nuvola', 'fenix', 'ntm', 'front', 1),
  ('FNA', 'Fenix Nero Assoluto', 'fenix', 'ntm', 'front', 2),
  ('FGC', 'Fenix Grigio Chiaro', 'fenix', 'ntm', 'front', 3),
  ('FGS', 'Fenix Grigio Scuro', 'fenix', 'ntm', 'front', 4),
  ('FCR', 'Fenix Crema', 'fenix', 'ntm', 'front', 5),
  ('HBN', 'HPL Bianco', 'hpl', 'mat', 'front', 10),
  ('HGR', 'HPL Grigio', 'hpl', 'mat', 'front', 11)
) AS c(color_code, color_name, material_type, finish, color_type, sort_order)
WHERE pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND pg.code = 'E4'
ON CONFLICT DO NOTHING;

-- Insert front colors for E7
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, finish, color_type, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', c.color_code, c.color_name, c.material_type, c.finish, c.color_type, c.sort_order
FROM price_groups pg
CROSS JOIN (VALUES
  ('LBO', 'Bianco Opaco', 'laccato', 'opaco', 'front', 1),
  ('LNO', 'Nero Opaco', 'laccato', 'opaco', 'front', 2),
  ('LGO', 'Grigio Opaco', 'laccato', 'opaco', 'front', 3),
  ('LCO', 'Cachemere Opaco', 'laccato', 'opaco', 'front', 4),
  ('LSO', 'Salvia Opaco', 'laccato', 'opaco', 'front', 5),
  ('LBL', 'Bianco Lucido', 'laccato', 'lucido', 'front', 10),
  ('LNL', 'Nero Lucido', 'laccato', 'lucido', 'front', 11),
  ('LGL', 'Grigio Lucido', 'laccato', 'lucido', 'front', 12)
) AS c(color_code, color_name, material_type, finish, color_type, sort_order)
WHERE pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND pg.code = 'E7'
ON CONFLICT DO NOTHING;

-- Insert corpus colors for Evolution price groups
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, finish, color_type, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', c.color_code, c.color_name, c.material_type, c.finish, c.color_type, c.sort_order
FROM price_groups pg
CROSS JOIN (VALUES
  ('KB', 'Korpus Bianco', 'melamine', 'mat', 'corpus', 1),
  ('KG', 'Korpus Grigio', 'melamine', 'mat', 'corpus', 2),
  ('KN', 'Korpus Noce', 'melamine', 'hout', 'corpus', 3),
  ('KA', 'Korpus Antraciet', 'melamine', 'mat', 'corpus', 4),
  ('KR', 'Korpus Rovere', 'melamine', 'hout', 'corpus', 5)
) AS c(color_code, color_name, material_type, finish, color_type, sort_order)
WHERE pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND pg.collection = 'evolution'
ON CONFLICT DO NOTHING;

-- Insert corpus colors for ART price groups
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, finish, color_type, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', c.color_code, c.color_name, c.material_type, c.finish, c.color_type, c.sort_order
FROM price_groups pg
CROSS JOIN (VALUES
  ('KB', 'Korpus Bianco', 'melamine', 'mat', 'corpus', 1),
  ('KG', 'Korpus Grigio', 'melamine', 'mat', 'corpus', 2),
  ('KA', 'Korpus Antraciet', 'melamine', 'mat', 'corpus', 3)
) AS c(color_code, color_name, material_type, finish, color_type, sort_order)
WHERE pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22' AND pg.collection = 'art'
ON CONFLICT DO NOTHING;
