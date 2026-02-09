ALTER TABLE quote_lines 
  ADD COLUMN IF NOT EXISTS range_override_id UUID REFERENCES product_ranges(id),
  ADD COLUMN IF NOT EXISTS color_override VARCHAR(255);