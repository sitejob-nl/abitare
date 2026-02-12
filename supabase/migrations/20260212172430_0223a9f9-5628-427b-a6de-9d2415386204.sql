
DO $$
DECLARE
  stosa_id uuid := '29a8e1aa-35da-4784-99ff-23129f36fe22';
BEGIN
  -- LOOK L1-L12
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order)
  VALUES
    (stosa_id, 'L1', 'Look Prijsgroep 1', 'look', 1),
    (stosa_id, 'L2', 'Look Prijsgroep 2', 'look', 2),
    (stosa_id, 'L3', 'Look Prijsgroep 3', 'look', 3),
    (stosa_id, 'L4', 'Look Prijsgroep 4', 'look', 4),
    (stosa_id, 'L5', 'Look Prijsgroep 5', 'look', 5),
    (stosa_id, 'L6', 'Look Prijsgroep 6', 'look', 6),
    (stosa_id, 'L7', 'Look Prijsgroep 7', 'look', 7),
    (stosa_id, 'L8', 'Look Prijsgroep 8', 'look', 8),
    (stosa_id, 'L9', 'Look Prijsgroep 9', 'look', 9),
    (stosa_id, 'L10', 'Look Prijsgroep 10', 'look', 10),
    (stosa_id, 'L11', 'Look Prijsgroep 11', 'look', 11),
    (stosa_id, 'L12', 'Look Prijsgroep 12', 'look', 12)
  ON CONFLICT (supplier_id, code) DO NOTHING;

  -- LOOK glass
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order, is_glass)
  VALUES
    (stosa_id, 'LA', 'Look Glas A', 'look', 13, true),
    (stosa_id, 'LB', 'Look Glas B', 'look', 14, true),
    (stosa_id, 'LC', 'Look Glas C', 'look', 15, true),
    (stosa_id, 'LDECOR', 'Look Decor Glass', 'look', 16, true),
    (stosa_id, 'LNATURAL', 'Look Natural Glass', 'look', 17, true),
    (stosa_id, 'LRIBBED', 'Look Ribbed Glass', 'look', 18, true),
    (stosa_id, 'LSLIM', 'Look Slim Glass', 'look', 19, true)
  ON CONFLICT (supplier_id, code) DO NOTHING;

  -- CLASSIC GLAMOUR CG1-CG7
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order)
  VALUES
    (stosa_id, 'CG1', 'Classic Glamour 1', 'classic_glamour', 1),
    (stosa_id, 'CG2', 'Classic Glamour 2', 'classic_glamour', 2),
    (stosa_id, 'CG3', 'Classic Glamour 3', 'classic_glamour', 3),
    (stosa_id, 'CG4', 'Classic Glamour 4', 'classic_glamour', 4),
    (stosa_id, 'CG5', 'Classic Glamour 5', 'classic_glamour', 5),
    (stosa_id, 'CG6', 'Classic Glamour 6', 'classic_glamour', 6),
    (stosa_id, 'CG7', 'Classic Glamour 7', 'classic_glamour', 7)
  ON CONFLICT (supplier_id, code) DO NOTHING;

  -- FRAME
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order)
  VALUES (stosa_id, 'FRAME', 'Frame', 'frame', 1)
  ON CONFLICT (supplier_id, code) DO NOTHING;

  -- ART
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order)
  VALUES
    (stosa_id, 'ART1', 'Art Prijsgroep I', 'art', 1),
    (stosa_id, 'ART2', 'Art Prijsgroep II', 'art', 2),
    (stosa_id, 'ART3', 'Art Prijsgroep III', 'art', 3),
    (stosa_id, 'ART4', 'Art Prijsgroep IV', 'art', 4),
    (stosa_id, 'ART5', 'Art Prijsgroep V', 'art', 5)
  ON CONFLICT (supplier_id, code) DO NOTHING;

  -- Evolution special glass
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order, is_glass)
  VALUES
    (stosa_id, 'NATURAL', 'Natural Glass', 'evolution', 14, true),
    (stosa_id, 'RIBBED', 'Ribbed Glass', 'evolution', 15, true),
    (stosa_id, 'SLIM', 'Slim Glass', 'evolution', 16, true)
  ON CONFLICT (supplier_id, code) DO NOTHING;

  -- Equipment
  INSERT INTO price_groups (supplier_id, code, name, collection, sort_order)
  VALUES (stosa_id, 'EQ', 'Equipment', 'evolution', 20)
  ON CONFLICT (supplier_id, code) DO NOTHING;
END $$;
