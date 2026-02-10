
-- Transport options for tegels category quotes
ALTER TABLE public.quotes ADD COLUMN requires_transport BOOLEAN DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN requires_kooiaap BOOLEAN DEFAULT false;
