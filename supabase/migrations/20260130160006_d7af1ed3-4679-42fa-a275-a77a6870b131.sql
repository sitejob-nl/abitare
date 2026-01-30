-- ============================================
-- FASE 2: PRODUCT CATALOGUS
-- ============================================

-- SUPPLIERS (Leveranciers)
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(50),
    lead_time_weeks INTEGER,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCT_CATEGORIES (Categorieën)
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES public.product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- PRODUCT_RANGES (Reeksen/Collecties)
CREATE TABLE public.product_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    price_group INTEGER,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(supplier_id, code)
);

-- PRODUCT_COLORS (Kleuren per reeks)
CREATE TABLE public.product_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    range_id UUID REFERENCES public.product_ranges(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    hex_color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(range_id, code)
);

-- PRODUCTS (Artikelen)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id),
    category_id UUID REFERENCES public.product_categories(id),
    article_code VARCHAR(50) NOT NULL,
    sku VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    width_mm INTEGER,
    height_mm INTEGER,
    depth_mm INTEGER,
    base_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    unit VARCHAR(20) DEFAULT 'stuk',
    vat_rate DECIMAL(5,2) DEFAULT 21,
    norm_hours DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, article_code)
);

-- PRODUCT_PRICES (Prijzen per prijsgroep)
CREATE TABLE public.product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    range_id UUID REFERENCES public.product_ranges(id),
    price DECIMAL(12,2) NOT NULL,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, range_id, valid_from)
);

-- TRIGGER: products updated_at
CREATE TRIGGER products_updated_at 
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- INDEXES
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_code ON public.products(article_code);

-- ============================================
-- RLS POLICIES - PRODUCT TABELLEN
-- ============================================

-- SUPPLIERS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_insert" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- PRODUCT_CATEGORIES
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_categories_select" ON public.product_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_categories_insert" ON public.product_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_categories_update" ON public.product_categories
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_categories_delete" ON public.product_categories
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- PRODUCT_RANGES
ALTER TABLE public.product_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_ranges_select" ON public.product_ranges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_ranges_insert" ON public.product_ranges
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_ranges_update" ON public.product_ranges
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_ranges_delete" ON public.product_ranges
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- PRODUCT_COLORS
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_colors_select" ON public.product_colors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_colors_insert" ON public.product_colors
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_colors_update" ON public.product_colors
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_colors_delete" ON public.product_colors
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

-- PRODUCT_PRICES
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_prices_select" ON public.product_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_prices_insert" ON public.product_prices
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_prices_update" ON public.product_prices
  FOR UPDATE TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "product_prices_delete" ON public.product_prices
  FOR DELETE TO authenticated USING (public.is_admin_or_manager(auth.uid()));