
-- Customers: Exact contact ID voor contactpersonen-sync
ALTER TABLE customers ADD COLUMN IF NOT EXISTS exact_contact_id text;

-- Quotes: Exact quotation ID + nummer
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exact_quotation_id text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exact_quotation_number text;

-- Products: Exact item ID voor artikelen-sync
ALTER TABLE products ADD COLUMN IF NOT EXISTS exact_item_id text;
