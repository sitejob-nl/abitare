
-- Add supplier_id to product_categories for brand-specific hierarchies
ALTER TABLE product_categories ADD COLUMN supplier_id uuid REFERENCES suppliers(id);

-- Index for fast lookups by supplier
CREATE INDEX idx_product_categories_supplier ON product_categories(supplier_id) WHERE supplier_id IS NOT NULL;
