-- =====================================================
-- Tradeplace Direct Connection Integration
-- =====================================================

-- 1. Extend suppliers table with Tradeplace fields
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS tradeplace_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tradeplace_gln TEXT,
ADD COLUMN IF NOT EXISTS tradeplace_endpoint TEXT;

-- 2. Extend products table with EAN and manufacturer ID
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS ean_code TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_product_id TEXT;

-- Create index on EAN code for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_ean_code ON public.products(ean_code);

-- 3. Create tradeplace_settings table
CREATE TABLE IF NOT EXISTS public.tradeplace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_gln TEXT,
  is_configured BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tradeplace_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write tradeplace settings
CREATE POLICY "Admins can manage tradeplace settings"
ON public.tradeplace_settings
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Create supplier_orders table
CREATE TABLE IF NOT EXISTS public.supplier_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  external_order_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount NUMERIC(12,2),
  sent_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expected_delivery_date DATE,
  xml_request TEXT,
  xml_response TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read supplier orders
CREATE POLICY "Authenticated users can read supplier orders"
ON public.supplier_orders
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins and managers can insert/update supplier orders
CREATE POLICY "Admins and managers can manage supplier orders"
ON public.supplier_orders
FOR ALL
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Create indexes for supplier_orders
CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_id ON public.supplier_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON public.supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON public.supplier_orders(status);

-- 5. Create supplier_order_lines table
CREATE TABLE IF NOT EXISTS public.supplier_order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_order_id UUID REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES public.order_lines(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ean_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  availability_status TEXT CHECK (availability_status IN ('unknown', 'in_stock', 'limited', 'out_of_stock', 'backorder')),
  availability_qty INTEGER,
  availability_checked_at TIMESTAMP WITH TIME ZONE,
  lead_time_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_order_lines ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read supplier order lines
CREATE POLICY "Authenticated users can read supplier order lines"
ON public.supplier_order_lines
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins and managers can manage supplier order lines
CREATE POLICY "Admins and managers can manage supplier order lines"
ON public.supplier_order_lines
FOR ALL
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Create indexes for supplier_order_lines
CREATE INDEX IF NOT EXISTS idx_supplier_order_lines_supplier_order_id ON public.supplier_order_lines(supplier_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_lines_product_id ON public.supplier_order_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_order_lines_ean_code ON public.supplier_order_lines(ean_code);

-- 6. Add updated_at triggers
CREATE TRIGGER update_tradeplace_settings_updated_at
BEFORE UPDATE ON public.tradeplace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_supplier_orders_updated_at
BEFORE UPDATE ON public.supplier_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();