-- Insert 13 Evolution price groups
INSERT INTO price_groups (code, name, collection, supplier_id, sort_order, is_glass, material_type, material_description) VALUES
('E1', 'Evolution E1', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 1, false, 'Termo Strutturato', 'Termo Strutturato'),
('E2', 'Evolution E2', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 2, false, 'Termo Strutturato / Laminato Materico / PET', 'Termo Strutturato, Laminato Materico, PET'),
('E3', 'Evolution E3', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 3, false, 'PET Millerighe / Laccato', 'PET Millerighe, Laccato opaco/lucido'),
('E4', 'Evolution E4', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 4, false, 'Fenix', 'Fenix'),
('E5', 'Evolution E5', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 5, false, 'Legno', 'Legno Frassino / Legno Rovere'),
('E6', 'Evolution E6', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 6, false, 'Laccato Opaco', 'Laccato Opaco'),
('E7', 'Evolution E7', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 7, false, 'Impiallacciato / Laccato Poro Chiuso', 'Impiallacciato Liscio, Laccato Opaco Poro Chiuso'),
('E8', 'Evolution E8', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 8, false, 'Laccato Lucido Spazzolato', 'Laccato Lucido Spazzolato'),
('E9', 'Evolution E9', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 9, false, 'Laccato Opaco Deluxe / Impiallacciato', 'Laccato Opaco Deluxe, Impiallacciato Liscio'),
('E10', 'Evolution E10', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 10, false, 'Impiallacciato Cannettato / Doghe', 'Impiallacciato Cannettato, Impiallacciato con Doghe'),
('A-EVO', 'Evolution A', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 11, true, 'Vetro / HPL / Neolith', 'Vetro Lucido, Vetro Satinato, Vetro Cannetè, HPL, HPL Onda, Neolith'),
('B-EVO', 'Evolution B', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 12, true, 'Vetro / HPL / Neolith', 'Vetro Lucido, Vetro Satinato, Vetro Cannetè, HPL, HPL Onda, Neolith'),
('C-EVO', 'Evolution C', 'Evolution', '29a8e1aa-35da-4784-99ff-23129f36fe22', 13, true, 'Vetro / HPL / Neolith', 'Vetro Lucido, Vetro Satinato, Vetro Cannetè, HPL, HPL Onda, Neolith');

-- Now insert all price_group_colors for each Evolution price group
-- We reference the price_groups by code to get their IDs

-- E1: Termo Strutturato - Metropolis (6 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Termo Strutturato', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-nodato', 'Rovere Nodato', 1),
  ('cemento-visone', 'Cemento Visone', 2),
  ('calce', 'Calce', 3),
  ('cemento-bianco', 'Cemento Bianco', 4),
  ('cemento', 'Cemento', 5),
  ('cemento-dark', 'Cemento Dark', 6)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E1' AND pg.collection = 'Evolution';

-- E2: Termo Strutturato - Metropolis (7 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Termo Strutturato', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('larice-noir', 'Larice Noir', 1),
  ('noce-eucalipto', 'Noce Eucalipto', 2),
  ('rovere-sole', 'Rovere Sole', 3),
  ('rovere-conero', 'Rovere Conero', 4),
  ('rovere-conero-riga', 'Rovere Conero riga', 5),
  ('noce-eucalipto-riga', 'Noce Eucalipto riga', 6),
  ('larice-brown', 'Larice Brown', 7)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E2' AND pg.collection = 'Evolution';

-- E2: Laminato Materico - Metropolis (8 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Laminato Materico', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-liquirizia', 'Rovere Liquirizia', 8),
  ('rovere-anice', 'Rovere Anice', 9),
  ('rovere-sesamo', 'Rovere Sesamo', 10),
  ('rovere-cumino', 'Rovere Cumino', 11),
  ('malta-cenere', 'Malta Cenere', 12),
  ('malta-ombra', 'Malta Ombra', 13),
  ('rovere-moro', 'Rovere Moro (finitura reverso)', 14),
  ('rovere-spiga', 'Rovere Spiga', 15)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E2' AND pg.collection = 'Evolution';

-- E2: PET - Metropolis (13 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'PET', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('nero-opaco', 'Nero opaco', 16),
  ('cachemere-opaco', 'Cachemere opaco', 17),
  ('bianco-assoluto-lucido', 'Bianco Assoluto lucido', 18),
  ('cachemere-lucido', 'Cachemere lucido', 19),
  ('bianco-assoluto-opaco', 'Bianco Assoluto opaco', 20),
  ('grau-opaco', 'Grau opaco', 21),
  ('grigio-freddo-opaco', 'Grigio Freddo opaco', 22),
  ('nebbia-opaco', 'Nebbia opaco', 23),
  ('grigio-fumo-opaco', 'Grigio Fumo opaco', 24),
  ('beige-seta-opaco', 'Beige Seta opaco', 25),
  ('caffe-opaco', 'Caffè opaco', 26),
  ('canna-di-fucile-opaco', 'Canna di Fucile opaco', 27),
  ('ginseng-opaco', 'Ginseng opaco', 28),
  ('acciaio-metal', 'Acciaio Metal', 29),
  ('bronze-metal', 'Bronze Metal', 30),
  ('ambra-opaco', 'Ambra opaco', 31),
  ('verde-pistacchio-opaco', 'Verde Pistacchio opaco', 32),
  ('blu-marino-opaco', 'Blu Marino opaco', 33),
  ('light-gold', 'Light Gold', 34),
  ('copper-brown', 'Copper Brown', 35)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E2' AND pg.collection = 'Evolution';

-- E3: PET Millerighe - Metropolis (9 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'PET Millerighe', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('verde-kitami', 'Verde Kitami', 1),
  ('blu-shaba', 'Blu Shaba', 2),
  ('grigio-aragona', 'Grigio Aragona', 3),
  ('giallo-evora', 'Giallo Evora', 4),
  ('rosso-namib', 'Rosso Namib', 5),
  ('grigio-fumo-opaco-mr', 'Grigio Fumo opaco', 6),
  ('nero-opaco-mr', 'Nero opaco', 7),
  ('nebbia-opaco-mr', 'Nebbia opaco', 8),
  ('grau-opaco-mr', 'Grau opaco', 9)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E3' AND pg.collection = 'Evolution';

-- E3: Laccato opaco/lucido - Metropolis (2 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Laccato opaco/lucido', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('bianco-ice-opaco', 'Bianco Ice opaco', 10),
  ('bianco-ice-lucido', 'Bianco Ice lucido', 11)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E3' AND pg.collection = 'Evolution';

-- E4: Fenix - Metropolis (12 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Fenix', 'front', 'Metropolis', true, v.sort_order
FROM price_groups pg, (VALUES
  ('bianco-kos', 'Bianco Kos', 1),
  ('grigio-efeso', 'Grigio Efeso', 2),
  ('nero-ingo', 'Nero Ingo', 3),
  ('grigio-bromo', 'Grigio Bromo', 4),
  ('rosso-jaipur', 'Rosso Jaipur', 5),
  ('grigio-londra', 'Grigio Londra', 6),
  ('beige-arizona', 'Beige Arizona', 7),
  ('cacao-orinoco', 'Cacao Orinoco', 8),
  ('blu-fes', 'Blu Fes', 9),
  ('verde-comodoro', 'Verde Comodoro', 10),
  ('castoro-ottawa', 'Castoro Ottawa', 11),
  ('grigio-antrim', 'Grigio Antrim', 12)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E4' AND pg.collection = 'Evolution';

-- E5: Legno Frassino - Palio (2 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Legno Frassino', 'front', 'Palio', true, v.sort_order
FROM price_groups pg, (VALUES
  ('porcellana', 'Porcellana', 1),
  ('tufo', 'Tufo', 2)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E5' AND pg.collection = 'Evolution';

-- E5: Legno Rovere - Palio (5 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Legno Rovere', 'front', 'Palio', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-nodato-e5', 'Rovere Nodato', 3),
  ('rovere-sesamo-e5', 'Rovere Sesamo', 4),
  ('rovere-cumino-e5', 'Rovere Cumino', 5),
  ('rovere-anice-e5', 'Rovere Anice', 6),
  ('rovere-liquirizia-e5', 'Rovere Liquirizia', 7)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E5' AND pg.collection = 'Evolution';

-- E6: Laccato Opaco - Color Trend (46 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Laccato Opaco', 'front', 'Color Trend', true, v.sort_order
FROM price_groups pg, (VALUES
  ('nero', 'Nero', 1), ('nero-assoluto', 'Nero Assoluto', 2), ('burro', 'Burro', 3),
  ('grigio-piacenza', 'Grigio Piacenza', 4), ('pomice', 'Pomice', 5), ('curcuma', 'Curcuma', 6),
  ('arena', 'Arena', 7), ('salina', 'Salina', 8), ('platino', 'Platino', 9),
  ('oliva', 'Oliva', 10), ('rugiada', 'Rugiada', 11), ('frost', 'Frost', 12),
  ('ombra', 'Ombra', 13), ('grigio-luna', 'Grigio Luna', 14), ('grigio-tweed', 'Grigio Tweed', 15),
  ('lava', 'Lava', 16), ('brunito', 'Brunito', 17), ('caffe', 'Caffé', 18),
  ('terra', 'Terra', 19), ('cacao', 'Cacao', 20), ('rubino', 'Rubino', 21),
  ('terracotta', 'Terracotta', 22), ('lavaredo', 'Lavaredo', 23), ('rosso-vivo', 'Rosso Vivo', 24),
  ('rosa-seta', 'Rosa Seta', 25), ('borgogna', 'Borgogna', 26), ('sabbia', 'Sabbia', 27),
  ('rosa-cipria', 'Rosa Cipria', 28), ('grigio-daytona', 'Grigio Daytona', 29), ('marsala', 'Marsala', 30),
  ('mosto', 'Mosto', 31), ('melograno', 'Melograno', 32), ('carta-zucchero', 'Carta Zucchero', 33),
  ('bromo', 'Bromo', 34), ('ginepro', 'Ginepro', 35), ('timo', 'Timo', 36),
  ('asparago', 'Asparago', 37), ('opale', 'Opale', 38), ('mediterraneo', 'Mediterraneo', 39),
  ('blu-zaffiro', 'Blu Zaffiro', 40), ('zenzero', 'Zenzero', 41), ('salvia', 'Salvia', 42),
  ('felce', 'Felce', 43), ('edera', 'Edera', 44), ('topazio', 'Topazio', 45),
  ('canapa', 'Canapa', 46)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E6' AND pg.collection = 'Evolution';

-- E7: Laccato Opaco Poro Chiuso - Palio (9 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Laccato Opaco Poro Chiuso', 'front', 'Palio', true, v.sort_order
FROM price_groups pg, (VALUES
  ('bianco-ice-pc', 'Bianco Ice', 1), ('arena-pc', 'Arena', 2), ('ombra-pc', 'Ombra', 3),
  ('burro-pc', 'Burro', 4), ('grigio-piacenza-pc', 'Grigio Piacenza', 5), ('edera-pc', 'Edera', 6),
  ('pomice-pc', 'Pomice', 7), ('terra-pc', 'Terra', 8), ('blu-storm', 'Blu Storm', 9)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E7' AND pg.collection = 'Evolution';

-- E7: Impiallacciato Liscio - Natural (2 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Impiallacciato Liscio', 'front', 'Natural', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-miele', 'Rovere Miele', 10),
  ('rovere-bianco', 'Rovere Bianco', 11)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E7' AND pg.collection = 'Evolution';

-- E8: Laccato Lucido Spazzolato - Color Trend (46 kleuren, zelfde als E6 maar ander material_type)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Laccato Lucido Spazzolato', 'front', 'Color Trend', true, v.sort_order
FROM price_groups pg, (VALUES
  ('nero-ls', 'Nero', 1), ('nero-assoluto-ls', 'Nero Assoluto', 2), ('burro-ls', 'Burro', 3),
  ('grigio-piacenza-ls', 'Grigio Piacenza', 4), ('pomice-ls', 'Pomice', 5), ('curcuma-ls', 'Curcuma', 6),
  ('arena-ls', 'Arena', 7), ('salina-ls', 'Salina', 8), ('platino-ls', 'Platino', 9),
  ('oliva-ls', 'Oliva', 10), ('rugiada-ls', 'Rugiada', 11), ('frost-ls', 'Frost', 12),
  ('ombra-ls', 'Ombra', 13), ('grigio-luna-ls', 'Grigio Luna', 14), ('grigio-tweed-ls', 'Grigio Tweed', 15),
  ('lava-ls', 'Lava', 16), ('brunito-ls', 'Brunito', 17), ('caffe-ls', 'Caffé', 18),
  ('terra-ls', 'Terra', 19), ('cacao-ls', 'Cacao', 20), ('rubino-ls', 'Rubino', 21),
  ('terracotta-ls', 'Terracotta', 22), ('lavaredo-ls', 'Lavaredo', 23), ('rosso-vivo-ls', 'Rosso Vivo', 24),
  ('rosa-seta-ls', 'Rosa Seta', 25), ('borgogna-ls', 'Borgogna', 26), ('sabbia-ls', 'Sabbia', 27),
  ('rosa-cipria-ls', 'Rosa Cipria', 28), ('grigio-daytona-ls', 'Grigio Daytona', 29), ('marsala-ls', 'Marsala', 30),
  ('mosto-ls', 'Mosto', 31), ('melograno-ls', 'Melograno', 32), ('carta-zucchero-ls', 'Carta Zucchero', 33),
  ('bromo-ls', 'Bromo', 34), ('ginepro-ls', 'Ginepro', 35), ('timo-ls', 'Timo', 36),
  ('asparago-ls', 'Asparago', 37), ('opale-ls', 'Opale', 38), ('mediterraneo-ls', 'Mediterraneo', 39),
  ('blu-zaffiro-ls', 'Blu Zaffiro', 40), ('zenzero-ls', 'Zenzero', 41), ('salvia-ls', 'Salvia', 42),
  ('felce-ls', 'Felce', 43), ('edera-ls', 'Edera', 44), ('topazio-ls', 'Topazio', 45),
  ('canapa-ls', 'Canapa', 46)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E8' AND pg.collection = 'Evolution';

-- E9: Laccato Opaco Deluxe - Color Trend (3 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Laccato Opaco Deluxe', 'front', 'Color Trend', true, v.sort_order
FROM price_groups pg, (VALUES
  ('magnolia-lux', 'Magnolia lux', 1),
  ('bronze-lux', 'Bronze lux', 2),
  ('metal-lux', 'Metal lux', 3)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E9' AND pg.collection = 'Evolution';

-- E9: Impiallacciato Liscio - Natural (4 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Impiallacciato Liscio', 'front', 'Natural', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-cognac', 'Rovere Cognac', 4),
  ('rovere-grey', 'Rovere Grey', 5),
  ('rovere-dark', 'Rovere Dark', 6),
  ('rovere-sahara', 'Rovere Sahara', 7)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E9' AND pg.collection = 'Evolution';

-- E10: Impiallacciato Cannettato - Natural (6 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Impiallacciato Cannettato', 'front', 'Natural', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-cognac-can', 'Rovere Cognac', 1), ('rovere-grey-can', 'Rovere Grey', 2),
  ('rovere-sahara-can', 'Rovere Sahara', 3), ('rovere-dark-can', 'Rovere Dark', 4),
  ('rovere-termocotto-can', 'Rovere Termocotto', 5), ('noce-elegant-can', 'Noce Elegant', 6)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E10' AND pg.collection = 'Evolution';

-- E10: Impiallacciato con Doghe - Natural (2 kleuren)
INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order)
SELECT pg.id, '29a8e1aa-35da-4784-99ff-23129f36fe22', v.color_code, v.color_name, 'Impiallacciato con Doghe', 'front', 'Natural', true, v.sort_order
FROM price_groups pg, (VALUES
  ('rovere-termocotto-dog', 'Rovere Termocotto', 7),
  ('noce-elegant-dog', 'Noce Elegant', 8)
) AS v(color_code, color_name, sort_order)
WHERE pg.code = 'E10' AND pg.collection = 'Evolution';

-- A/B/C: Aliant glas prijsgroepen - identieke kleuren voor elk
-- We use a DO block to insert for all three groups
DO $$
DECLARE
  pg_id uuid;
  pg_code text;
BEGIN
  FOR pg_code IN SELECT unnest(ARRAY['A-EVO', 'B-EVO', 'C-EVO']) LOOP
    SELECT id INTO pg_id FROM price_groups WHERE code = pg_code AND collection = 'Evolution';

    -- Vetro Lucido (12 kleuren)
    INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order) VALUES
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'nero-luc', 'Nero luc.', 'Vetro Lucido', 'front', 'Aliant', true, 1),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'bianco-ice-luc', 'Bianco Ice luc.', 'Vetro Lucido', 'front', 'Aliant', true, 2),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'lava-luc', 'Lava luc.', 'Vetro Lucido', 'front', 'Aliant', true, 3),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'frost-luc', 'Frost luc.', 'Vetro Lucido', 'front', 'Aliant', true, 4),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'canapa-luc', 'Canapa luc.', 'Vetro Lucido', 'front', 'Aliant', true, 5),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'platino-luc', 'Platino luc.', 'Vetro Lucido', 'front', 'Aliant', true, 6),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'grigio-daytona-luc', 'Grigio Daytona luc.', 'Vetro Lucido', 'front', 'Aliant', true, 7),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'borgogna-luc', 'Borgogna luc.', 'Vetro Lucido', 'front', 'Aliant', true, 8),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'terra-luc', 'Terra luc.', 'Vetro Lucido', 'front', 'Aliant', true, 9),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'bromo-luc', 'Bromo luc.', 'Vetro Lucido', 'front', 'Aliant', true, 10),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'grigio-luna-luc', 'Grigio Luna luc.', 'Vetro Lucido', 'front', 'Aliant', true, 11),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'salina-luc', 'Salina luc.', 'Vetro Lucido', 'front', 'Aliant', true, 12);

    -- Vetro Satinato (12 kleuren)
    INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order) VALUES
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'nero-sat', 'Nero op.', 'Vetro Satinato', 'front', 'Aliant', true, 13),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'bianco-ice-sat', 'Bianco Ice op.', 'Vetro Satinato', 'front', 'Aliant', true, 14),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'lava-sat', 'Lava op.', 'Vetro Satinato', 'front', 'Aliant', true, 15),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'frost-sat', 'Frost op.', 'Vetro Satinato', 'front', 'Aliant', true, 16),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'canapa-sat', 'Canapa op.', 'Vetro Satinato', 'front', 'Aliant', true, 17),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'platino-sat', 'Platino op.', 'Vetro Satinato', 'front', 'Aliant', true, 18),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'grigio-daytona-sat', 'Grigio Daytona op.', 'Vetro Satinato', 'front', 'Aliant', true, 19),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'borgogna-sat', 'Borgogna op.', 'Vetro Satinato', 'front', 'Aliant', true, 20),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'terra-sat', 'Terra op.', 'Vetro Satinato', 'front', 'Aliant', true, 21),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'bromo-sat', 'Bromo op.', 'Vetro Satinato', 'front', 'Aliant', true, 22),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'grigio-luna-sat', 'Grigio Luna op.', 'Vetro Satinato', 'front', 'Aliant', true, 23),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'salina-sat', 'Salina op.', 'Vetro Satinato', 'front', 'Aliant', true, 24);

    -- Vetro Cannetè Opaco (4 kleuren)
    INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order) VALUES
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'grigio-cannete', 'Grigio Cannetè', 'Vetro Cannetè Opaco', 'front', 'Aliant', true, 25),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'limo-cannete', 'Limo Cannetè', 'Vetro Cannetè Opaco', 'front', 'Aliant', true, 26),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'nero-cannete', 'Nero Cannetè', 'Vetro Cannetè Opaco', 'front', 'Aliant', true, 27),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'ghiaccio-cannete', 'Ghiaccio Cannetè', 'Vetro Cannetè Opaco', 'front', 'Aliant', true, 28);

    -- HPL Onda (2 kleuren)
    INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order) VALUES
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'termocotto-onda', 'Termocotto Onda', 'HPL Onda', 'front', 'Aliant', true, 29),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'noce-onda', 'Noce Onda', 'HPL Onda', 'front', 'Aliant', true, 30);

    -- HPL (9 kleuren)
    INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order) VALUES
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'grafite-brown', 'Grafite Brown', 'HPL', 'front', 'Aliant', true, 31),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'testa-di-moro', 'Testa di Moro', 'HPL', 'front', 'Aliant', true, 32),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'cemento-hpl', 'Cemento', 'HPL', 'front', 'Aliant', true, 33),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'lavagna', 'Lavagna', 'HPL', 'front', 'Aliant', true, 34),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'calacatta', 'Calacatta', 'HPL', 'front', 'Aliant', true, 35),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'ossido', 'Ossido', 'HPL', 'front', 'Aliant', true, 36),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'nero-street', 'Nero Street', 'HPL', 'front', 'Aliant', true, 37),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'golden-moon', 'Golden Moon', 'HPL', 'front', 'Aliant', true, 38),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'samas-oro', 'Samas Oro', 'HPL', 'front', 'Aliant', true, 39);

    -- Neolith (13 kleuren)
    INSERT INTO price_group_colors (price_group_id, supplier_id, color_code, color_name, material_type, color_type, model_code, is_available, sort_order) VALUES
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'just-white-silk', 'Just White Silk', 'Neolith', 'front', 'Aliant', true, 40),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'basalt-black-satin', 'Basalt Black Satin', 'Neolith', 'front', 'Aliant', true, 41),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'pietra-di-luna-silk', 'Pietra di Luna Silk', 'Neolith', 'front', 'Aliant', true, 42),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'barro-satin', 'Barro Satin', 'Neolith', 'front', 'Aliant', true, 43),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'nero-satin', 'Nero Satin', 'Neolith', 'front', 'Aliant', true, 44),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'pietra-di-piombo-silk', 'Pietra di Piombo Silk', 'Neolith', 'front', 'Aliant', true, 45),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'calacatta-silk', 'Calacatta Silk', 'Neolith', 'front', 'Aliant', true, 46),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'calatorao-silk', 'Calatorao Silk', 'Neolith', 'front', 'Aliant', true, 47),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'zaha-stone-silk', 'Zaha Stone Silk', 'Neolith', 'front', 'Aliant', true, 48),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'wulong-silk', 'Wulong Silk', 'Neolith', 'front', 'Aliant', true, 49),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'shilin-silk', 'Shilin Silk', 'Neolith', 'front', 'Aliant', true, 50),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'new-york-silk', 'New York Silk', 'Neolith', 'front', 'Aliant', true, 51),
    (pg_id, '29a8e1aa-35da-4784-99ff-23129f36fe22', 'abu-dhabi-white-silk', 'Abu Dhabi White Silk', 'Neolith', 'front', 'Aliant', true, 52);

  END LOOP;
END $$;