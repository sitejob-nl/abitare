
-- Create role_menu_permissions table
CREATE TABLE public.role_menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  menu_key text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  UNIQUE (role, menu_key)
);

-- Enable RLS
ALTER TABLE public.role_menu_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated users
CREATE POLICY "Authenticated users can read menu permissions"
ON public.role_menu_permissions
FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE only for admins
CREATE POLICY "Admins can manage menu permissions"
ON public.role_menu_permissions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Seed default data
INSERT INTO public.role_menu_permissions (role, menu_key, visible) VALUES
  -- Admin: everything visible
  ('admin', 'dashboard', true),
  ('admin', 'customers', true),
  ('admin', 'quotes', true),
  ('admin', 'orders', true),
  ('admin', 'invoices', true),
  ('admin', 'calendar', true),
  ('admin', 'leave', true),
  ('admin', 'installation', true),
  ('admin', 'service', true),
  ('admin', 'inbox', true),
  ('admin', 'products', true),
  ('admin', 'reports', true),
  ('admin', 'settings', true),
  -- Manager: everything except settings
  ('manager', 'dashboard', true),
  ('manager', 'customers', true),
  ('manager', 'quotes', true),
  ('manager', 'orders', true),
  ('manager', 'invoices', true),
  ('manager', 'calendar', true),
  ('manager', 'leave', true),
  ('manager', 'installation', true),
  ('manager', 'service', true),
  ('manager', 'inbox', true),
  ('manager', 'products', true),
  ('manager', 'reports', true),
  ('manager', 'settings', false),
  -- Verkoper: limited access
  ('verkoper', 'dashboard', true),
  ('verkoper', 'customers', true),
  ('verkoper', 'quotes', true),
  ('verkoper', 'orders', true),
  ('verkoper', 'invoices', true),
  ('verkoper', 'calendar', true),
  ('verkoper', 'leave', true),
  ('verkoper', 'installation', false),
  ('verkoper', 'service', true),
  ('verkoper', 'inbox', true),
  ('verkoper', 'products', false),
  ('verkoper', 'reports', false),
  ('verkoper', 'settings', false),
  -- Monteur: not relevant (own portal), but seed for completeness
  ('monteur', 'dashboard', false),
  ('monteur', 'customers', false),
  ('monteur', 'quotes', false),
  ('monteur', 'orders', false),
  ('monteur', 'invoices', false),
  ('monteur', 'calendar', false),
  ('monteur', 'leave', true),
  ('monteur', 'installation', false),
  ('monteur', 'service', false),
  ('monteur', 'inbox', false),
  ('monteur', 'products', false),
  ('monteur', 'reports', false),
  ('monteur', 'settings', false);
