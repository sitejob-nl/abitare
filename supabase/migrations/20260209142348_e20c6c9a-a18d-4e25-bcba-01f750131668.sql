
-- ============================================================
-- 1.1 Suppliers tabel uitbreiden
-- ============================================================
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS has_price_groups BOOLEAN DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS price_system TEXT DEFAULT 'direct';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS points_to_eur DECIMAL(10,4);

-- ============================================================
-- 1.2 Product_ranges tabel uitbreiden
-- ============================================================
ALTER TABLE public.product_ranges ADD COLUMN IF NOT EXISTS collection TEXT;
ALTER TABLE public.product_ranges ADD COLUMN IF NOT EXISTS available_price_groups TEXT[];

-- ============================================================
-- 1.3 Nieuwe tabel: price_groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  collection TEXT,
  sort_order INTEGER DEFAULT 0,
  is_glass BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(supplier_id, code, collection)
);

ALTER TABLE public.price_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_groups_select" ON public.price_groups FOR SELECT USING (true);
CREATE POLICY "price_groups_insert" ON public.price_groups FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "price_groups_update" ON public.price_groups FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "price_groups_delete" ON public.price_groups FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 1.4 Nieuwe tabel: price_group_colors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_group_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_group_id UUID REFERENCES public.price_groups(id) ON DELETE CASCADE,
  color_code TEXT NOT NULL,
  color_name TEXT NOT NULL,
  material_type TEXT,
  finish TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(price_group_id, color_code)
);

ALTER TABLE public.price_group_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_group_colors_select" ON public.price_group_colors FOR SELECT USING (true);
CREATE POLICY "price_group_colors_insert" ON public.price_group_colors FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "price_group_colors_update" ON public.price_group_colors FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "price_group_colors_delete" ON public.price_group_colors FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 1.5 Nieuwe tabel: worktop_materials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.worktop_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  material_type TEXT,
  thickness_mm INTEGER,
  edge_type TEXT,
  price_per_meter DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(supplier_id, code)
);

ALTER TABLE public.worktop_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worktop_materials_select" ON public.worktop_materials FOR SELECT USING (true);
CREATE POLICY "worktop_materials_insert" ON public.worktop_materials FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "worktop_materials_update" ON public.worktop_materials FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "worktop_materials_delete" ON public.worktop_materials FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 1.6 Nieuwe tabel: plinth_options
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plinth_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  height_mm INTEGER,
  material TEXT,
  price_per_meter DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(supplier_id, code)
);

ALTER TABLE public.plinth_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plinth_options_select" ON public.plinth_options FOR SELECT USING (true);
CREATE POLICY "plinth_options_insert" ON public.plinth_options FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "plinth_options_update" ON public.plinth_options FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "plinth_options_delete" ON public.plinth_options FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 1.7 Quote_sections: price_group_id kolom
-- ============================================================
ALTER TABLE public.quote_sections ADD COLUMN IF NOT EXISTS price_group_id UUID REFERENCES public.price_groups(id);
ALTER TABLE public.order_sections ADD COLUMN IF NOT EXISTS price_group_id UUID REFERENCES public.price_groups(id);

-- ============================================================
-- 1.8 Seed data: STOSA Evolution prijsgroepen E1-E10 + A, B, C
-- ============================================================
INSERT INTO public.price_groups (supplier_id, code, name, collection, sort_order, is_glass)
SELECT 
  s.id,
  pg.code,
  pg.name,
  'evolution',
  pg.sort_order,
  pg.is_glass
FROM public.suppliers s
CROSS JOIN (VALUES
  ('E1', 'Prijsgroep E1 - Termo Strutturato basis', 1, false),
  ('E2', 'Prijsgroep E2 - PET/Laminato/Termo', 2, false),
  ('E3', 'Prijsgroep E3 - Laccato/PET Millerighe', 3, false),
  ('E4', 'Prijsgroep E4 - Fenix', 4, false),
  ('E5', 'Prijsgroep E5 - Legno Frassino', 5, false),
  ('E6', 'Prijsgroep E6 - Laccato opaco', 6, false),
  ('E7', 'Prijsgroep E7 - Impiallacciato/Legno Rovere', 7, false),
  ('E8', 'Prijsgroep E8 - Laccato lucido/Deluxe', 8, false),
  ('E9', 'Prijsgroep E9 - Impiallacciato premium', 9, false),
  ('E10', 'Prijsgroep E10 - Cannettato/Doghe', 10, false),
  ('A', 'Glas A - Vetro Lucido', 11, true),
  ('B', 'Glas B - Vetro Satinato', 12, true),
  ('C', 'Glas C - HPL/Neolith', 13, true)
) AS pg(code, name, sort_order, is_glass)
WHERE s.code = 'STOS1IT'
ON CONFLICT (supplier_id, code, collection) DO NOTHING;

-- Set STOSA supplier to use price_groups system
UPDATE public.suppliers 
SET has_price_groups = true, price_system = 'price_groups'
WHERE code = 'STOS1IT';
