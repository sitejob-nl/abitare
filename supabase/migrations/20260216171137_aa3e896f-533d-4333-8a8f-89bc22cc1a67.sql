
-- ============================================
-- Extend products table with appliance fields
-- ============================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS depth_open_door_mm integer,
  ADD COLUMN IF NOT EXISTS weight_net_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS weight_gross_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS niche_height_min_mm integer,
  ADD COLUMN IF NOT EXISTS niche_height_max_mm integer,
  ADD COLUMN IF NOT EXISTS niche_width_min_mm integer,
  ADD COLUMN IF NOT EXISTS niche_width_max_mm integer,
  ADD COLUMN IF NOT EXISTS niche_depth_mm integer,
  ADD COLUMN IF NOT EXISTS energy_class varchar(10),
  ADD COLUMN IF NOT EXISTS energy_consumption_kwh numeric(10,2),
  ADD COLUMN IF NOT EXISTS water_consumption_l numeric(10,2),
  ADD COLUMN IF NOT EXISTS noise_db integer,
  ADD COLUMN IF NOT EXISTS noise_class varchar(5),
  ADD COLUMN IF NOT EXISTS construction_type varchar(50),
  ADD COLUMN IF NOT EXISTS installation_type varchar(100),
  ADD COLUMN IF NOT EXISTS connection_power_w integer,
  ADD COLUMN IF NOT EXISTS voltage_v integer,
  ADD COLUMN IF NOT EXISTS current_a integer,
  ADD COLUMN IF NOT EXISTS color_main varchar(100),
  ADD COLUMN IF NOT EXISTS color_basic varchar(100),
  ADD COLUMN IF NOT EXISTS product_family varchar(100),
  ADD COLUMN IF NOT EXISTS product_series varchar(100),
  ADD COLUMN IF NOT EXISTS product_status varchar(50),
  ADD COLUMN IF NOT EXISTS retail_price numeric,
  ADD COLUMN IF NOT EXISTS datasheet_url text;

-- Add media_type to pims_image_queue
ALTER TABLE public.pims_image_queue
  ADD COLUMN IF NOT EXISTS media_type varchar(50) DEFAULT 'photo';

-- Add media_type to product_images
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS media_type varchar(50) DEFAULT 'photo';

-- Seed standard appliance categories
INSERT INTO public.product_categories (code, name, sort_order, is_active) VALUES
  ('DISHWASHERS', 'Vaatwassers', 10, true),
  ('OVENS', 'Ovens', 20, true),
  ('COMBI_STEAM_OVEN', 'Combi-stoomovens', 25, true),
  ('STEAM_OVENS', 'Stoomovens', 26, true),
  ('MICROWAVE_OVENS', 'Magnetrons', 27, true),
  ('HOBS', 'Kookplaten', 30, true),
  ('VENTING_HOBS', 'Kookplaten met afzuiging', 31, true),
  ('HOODS', 'Afzuigkappen', 35, true),
  ('REFRIGERATORS', 'Koelkasten', 40, true),
  ('FREEZERS', 'Vriezers', 45, true),
  ('FRIDGE_FREEZER_COMBINATIONS', 'Koel-vriescombinaties', 46, true),
  ('WINE_STORAGE', 'Wijnkasten', 50, true),
  ('WASHING_MACHINES', 'Wasmachines', 60, true),
  ('DRYERS', 'Drogers', 65, true),
  ('WASHER_DRYERS', 'Wasdrogers', 66, true),
  ('AUTOMATIC_COFFEE_MAKER', 'Koffiemachines', 70, true),
  ('PLATEWARMERS', 'Warmhoudlades', 75, true),
  ('VACUUM_CANISTER_CYLINDER', 'Stofzuigers', 80, true),
  ('VACUUM_RECHARGEABLE', 'Accu-stofzuigers', 81, true),
  ('ACCESSORIES', 'Accessoires', 90, true),
  ('OTHER_PRODUCTS', 'Overige producten', 99, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;
