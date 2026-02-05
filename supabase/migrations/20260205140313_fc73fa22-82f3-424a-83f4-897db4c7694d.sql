-- ============================================================
-- STOSA Volledige Ondersteuning - Fase 2
-- ============================================================

-- 1. Product Ranges Uitbreiden
ALTER TABLE product_ranges ADD COLUMN IF NOT EXISTS 
  is_handleless BOOLEAN DEFAULT false;

ALTER TABLE product_ranges ADD COLUMN IF NOT EXISTS 
  door_type TEXT;

CREATE INDEX IF NOT EXISTS idx_product_ranges_type ON product_ranges(type);

-- 2. Product Colors - Kleur Type Toevoegen
ALTER TABLE product_colors ADD COLUMN IF NOT EXISTS 
  color_type TEXT DEFAULT 'front';

-- 3. Nieuwe Tabel: Leverancier Kortingen
CREATE TABLE IF NOT EXISTS supplier_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  discount_group TEXT NOT NULL,
  discount_percent DECIMAL(5,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, discount_group)
);

-- Enable RLS
ALTER TABLE supplier_discounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_discounts
CREATE POLICY "Authenticated users can view supplier discounts"
  ON supplier_discounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage supplier discounts"
  ON supplier_discounts FOR ALL
  TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- 4. Nieuwe Tabel: Montage Tarieven
CREATE TABLE IF NOT EXISTS installation_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'stuk',
  default_price DECIMAL(10,2),
  vat_rate DECIMAL(5,2) DEFAULT 21,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE installation_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installation_rates
CREATE POLICY "Authenticated users can view installation rates"
  ON installation_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage installation rates"
  ON installation_rates FOR ALL
  TO authenticated
  USING (is_admin_or_manager(auth.uid()));

-- Seed standaard tarieven
INSERT INTO installation_rates (code, name, unit, default_price) VALUES
  ('STOSA', 'Keuken montage per m1', 'm1', 200.00),
  ('AANSLUIT', 'Aansluitkosten op maat gelegde leidingen', 'stuk', 175.00),
  ('KOKENDW', 'Aansluiten kokendwater kraan', 'stuk', 100.00),
  ('ZONE1', 'Transportkosten zone 1 (Limburg)', 'stuk', 250.00),
  ('ZONE2', 'Transportkosten zone 2', 'stuk', 350.00)
ON CONFLICT (code) DO NOTHING;

-- 5. Nieuwe Tabel: Werkblad Bewerkingen
CREATE TABLE IF NOT EXISTS worktop_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  price_type TEXT DEFAULT 'fixed',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, code)
);

-- Enable RLS
ALTER TABLE worktop_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worktop_operations
CREATE POLICY "Authenticated users can view worktop operations"
  ON worktop_operations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage worktop operations"
  ON worktop_operations FOR ALL
  TO authenticated
  USING (is_admin_or_manager(auth.uid()));