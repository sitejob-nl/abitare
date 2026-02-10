
-- Add address fields at order level for montage, delivery, and invoice addresses
ALTER TABLE public.orders
  ADD COLUMN installation_street_address text,
  ADD COLUMN installation_postal_code text,
  ADD COLUMN installation_city text,
  ADD COLUMN delivery_street_address text,
  ADD COLUMN delivery_postal_code text,
  ADD COLUMN delivery_city text,
  ADD COLUMN invoice_street_address text,
  ADD COLUMN invoice_postal_code text,
  ADD COLUMN invoice_city text;

-- Add comments for clarity
COMMENT ON COLUMN public.orders.installation_street_address IS 'Montageadres - straat';
COMMENT ON COLUMN public.orders.installation_postal_code IS 'Montageadres - postcode';
COMMENT ON COLUMN public.orders.installation_city IS 'Montageadres - stad';
COMMENT ON COLUMN public.orders.delivery_street_address IS 'Afleveradres - straat';
COMMENT ON COLUMN public.orders.delivery_postal_code IS 'Afleveradres - postcode';
COMMENT ON COLUMN public.orders.delivery_city IS 'Afleveradres - stad';
COMMENT ON COLUMN public.orders.invoice_street_address IS 'Factuuradres - straat';
COMMENT ON COLUMN public.orders.invoice_postal_code IS 'Factuuradres - postcode';
COMMENT ON COLUMN public.orders.invoice_city IS 'Factuuradres - stad';
