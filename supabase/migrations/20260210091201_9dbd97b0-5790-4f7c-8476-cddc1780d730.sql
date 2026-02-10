
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'keuken';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_price_group_id UUID REFERENCES price_groups(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS default_corpus_color_id UUID REFERENCES product_colors(id);

CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category);
CREATE INDEX IF NOT EXISTS idx_quotes_default_supplier ON quotes(default_supplier_id);
