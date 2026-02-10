
-- Add book_price to products (catalogusprijs/boekprijs leverancier)
ALTER TABLE public.products ADD COLUMN book_price DECIMAL(12,2);

-- Add price_factor to suppliers (factor waarmee inkoop wordt vermenigvuldigd)
ALTER TABLE public.suppliers ADD COLUMN price_factor DECIMAL(6,3) DEFAULT 1.0;

-- Add price_type to quote_lines (welk prijstype is gekozen: 'abitare' of 'boekprijs')
ALTER TABLE public.quote_lines ADD COLUMN price_type VARCHAR(20) DEFAULT 'abitare';
