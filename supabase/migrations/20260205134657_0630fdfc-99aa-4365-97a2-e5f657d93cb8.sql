-- Voeg type kolom toe aan product_ranges voor variabele type (FPC, CAM, MOL, etc.)
ALTER TABLE product_ranges ADD COLUMN IF NOT EXISTS type text;

-- Voeg kortingsgroep en cataloguscode toe aan products
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_group text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_code text;

-- Voeg secundaire variant kolommen toe aan product_prices
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS variant_2_code text;
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS variant_2_name text;

-- Index voor sneller zoeken op kortingsgroep
CREATE INDEX IF NOT EXISTS idx_products_discount_group ON products(discount_group) WHERE discount_group IS NOT NULL;

-- Index voor cataloguscode
CREATE INDEX IF NOT EXISTS idx_products_catalog_code ON products(catalog_code) WHERE catalog_code IS NOT NULL;

-- Index voor secundaire varianten
CREATE INDEX IF NOT EXISTS idx_product_prices_variant_2 ON product_prices(variant_2_code) WHERE variant_2_code IS NOT NULL;