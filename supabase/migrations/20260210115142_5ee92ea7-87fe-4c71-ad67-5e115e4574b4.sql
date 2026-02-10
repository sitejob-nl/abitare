
ALTER TABLE public.orders
ADD COLUMN deposit_required boolean NOT NULL DEFAULT true,
ADD COLUMN deposit_invoice_sent boolean NOT NULL DEFAULT false,
ADD COLUMN deposit_reminder_date date;
