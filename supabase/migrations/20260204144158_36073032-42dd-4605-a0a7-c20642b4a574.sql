-- Voeg admin rol toe aan kas@sitejob.nl zodat hij gebruikers kan beheren
INSERT INTO public.user_roles (user_id, role)
SELECT '7dae8a4c-08e4-4505-b078-2cb5d8752ce2', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '7dae8a4c-08e4-4505-b078-2cb5d8752ce2' 
  AND role = 'admin'
);

-- Voeg ook admin rol toe aan demo@sitejob.nl
INSERT INTO public.user_roles (user_id, role)
SELECT '94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9' 
  AND role = 'admin'
);