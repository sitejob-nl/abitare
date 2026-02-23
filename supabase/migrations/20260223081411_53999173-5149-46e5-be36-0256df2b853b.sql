
-- Audit trail tabel voor alle TMH2 berichten
CREATE TABLE public.tradeplace_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  supplier_order_id UUID REFERENCES public.supplier_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  raw_xml TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.tradeplace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view tradeplace messages"
  ON public.tradeplace_messages FOR SELECT
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Service role can insert tradeplace messages"
  ON public.tradeplace_messages FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_tradeplace_messages_supplier_order ON public.tradeplace_messages(supplier_order_id);
CREATE INDEX idx_tradeplace_messages_type ON public.tradeplace_messages(message_type);
CREATE INDEX idx_tradeplace_messages_created ON public.tradeplace_messages(created_at DESC);

-- Voorraadinformatie uit StockPush op products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tradeplace_stock JSONB;

-- Factuurgegevens op supplier_orders
ALTER TABLE public.supplier_orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS invoice_date DATE;
