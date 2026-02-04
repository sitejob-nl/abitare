-- Fix: RLS tijdelijk uitschakelen voor rol-toewijzing
-- Dit is nodig omdat migraties als service role draaien maar
-- RLS policies auth.uid() gebruiken die null is in deze context

ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Admin rol voor demo@sitejob.nl (was niet toegevoegd door RLS blokkade)
INSERT INTO public.user_roles (user_id, role)
VALUES ('94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Voeg ook monteur rol toe aan demo@sitejob.nl zodat je kan testen
INSERT INTO public.user_roles (user_id, role)
VALUES ('94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9', 'monteur')
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS weer inschakelen
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;