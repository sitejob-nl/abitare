
-- Voeg nieuwe kolommen toe aan quote_sections (supplier_id, model_code, model_name)
-- price_group_id en section_type bestaan al
ALTER TABLE quote_sections 
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS model_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS model_name VARCHAR(100);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_quote_sections_supplier ON quote_sections(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quote_sections_model ON quote_sections(model_code);

-- ============================================================
-- STOSA Models tabel
-- ============================================================
CREATE TABLE IF NOT EXISTS stosa_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stosa_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stosa_models_select" ON stosa_models FOR SELECT USING (true);
CREATE POLICY "stosa_models_insert" ON stosa_models FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "stosa_models_update" ON stosa_models FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "stosa_models_delete" ON stosa_models FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- Seed STOSA models
INSERT INTO stosa_models (code, name, description, sort_order) VALUES
  ('evolution_metropolis', 'Evolution Metropolis', 'Modern design met kunststof toplaag', 1),
  ('evolution_metropolis_mdf', 'Evolution Metropolis MDF', 'MDF front met kunststof toplaag', 2),
  ('aliant', 'Aliant', 'Strakke greeploze lijn', 3),
  ('infinity', 'Infinity', 'Premium design', 4),
  ('city', 'City', 'Urban style', 5),
  ('replay', 'Replay', 'Klassiek modern', 6),
  ('maya', 'Maya', 'Landelijke stijl', 7),
  ('virginia', 'Virginia', 'Klassiek', 8),
  ('york', 'York', 'Engelse stijl', 9),
  ('beverly', 'Beverly', 'Amerikaanse stijl', 10)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- STOSA Front Types
-- ============================================================
CREATE TABLE IF NOT EXISTS stosa_front_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(50) NOT NULL REFERENCES stosa_models(code),
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_groups TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  UNIQUE(model_code, code)
);

ALTER TABLE stosa_front_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stosa_front_types_select" ON stosa_front_types FOR SELECT USING (true);
CREATE POLICY "stosa_front_types_insert" ON stosa_front_types FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "stosa_front_types_update" ON stosa_front_types FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "stosa_front_types_delete" ON stosa_front_types FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- Seed front types
INSERT INTO stosa_front_types (model_code, code, name, price_groups) VALUES
  ('evolution_metropolis', 'MPTS LB', 'Kunststof toplaag LB', ARRAY['A', 'B', '1', '2', '3', '4', '5', '6']),
  ('evolution_metropolis', 'MPTS HG', 'Kunststof toplaag HG', ARRAY['A', 'B', '1', '2', '3', '4', '5', '6']),
  ('evolution_metropolis_mdf', 'MPPT CHO', 'MDF Opaco', ARRAY['A', 'B', '1', '2', '3', '4', '5', '6']),
  ('evolution_metropolis_mdf', 'MPPT LUC', 'MDF Lucido', ARRAY['A', 'B', '1', '2', '3', '4', '5', '6'])
ON CONFLICT (model_code, code) DO NOTHING;

-- ============================================================
-- STOSA Kleuren
-- ============================================================
CREATE TABLE IF NOT EXISTS stosa_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  hex_color VARCHAR(7),
  color_type VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE stosa_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stosa_colors_select" ON stosa_colors FOR SELECT USING (true);
CREATE POLICY "stosa_colors_insert" ON stosa_colors FOR INSERT WITH CHECK (is_admin_or_manager(auth.uid()));
CREATE POLICY "stosa_colors_update" ON stosa_colors FOR UPDATE USING (is_admin_or_manager(auth.uid()));
CREATE POLICY "stosa_colors_delete" ON stosa_colors FOR DELETE USING (is_admin_or_manager(auth.uid()));

-- Seed kleuren
INSERT INTO stosa_colors (code, name, color_type, sort_order) VALUES
  ('noce_eucalipto', 'Noce Eucalipto', 'front', 1),
  ('cachemere_opaco', 'Cachemere Opaco', 'front', 2),
  ('bianco', 'Bianco', 'front', 3),
  ('grigio', 'Grigio', 'front', 4),
  ('nero', 'Nero', 'front', 5),
  ('rose', 'Rose', 'corpus', 1),
  ('bianco_corpus', 'Bianco', 'corpus', 2),
  ('grigio_corpus', 'Grigio', 'corpus', 3),
  ('titanio', 'Titanio', 'handle', 1),
  ('nero_handle', 'Nero', 'handle', 2),
  ('inox', 'Inox', 'handle', 3),
  ('pvc_titanio', 'PVC Titanio', 'plinth', 1),
  ('pvc_nero', 'PVC Nero', 'plinth', 2),
  ('pvc_alluminio', 'PVC Alluminio', 'plinth', 3)
ON CONFLICT (code) DO NOTHING;
