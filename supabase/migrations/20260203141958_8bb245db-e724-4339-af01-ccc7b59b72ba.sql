-- Add quote_id column to service_tickets
ALTER TABLE public.service_tickets
ADD COLUMN quote_id UUID REFERENCES public.quotes(id);