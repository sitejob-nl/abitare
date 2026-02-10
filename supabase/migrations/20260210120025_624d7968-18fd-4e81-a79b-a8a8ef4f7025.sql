
-- Create order checklist items table
CREATE TABLE public.order_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID,
  checked_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other order-related tables)
CREATE POLICY "Authenticated users can view checklist items"
  ON public.order_checklist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert checklist items"
  ON public.order_checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update checklist items"
  ON public.order_checklist_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete checklist items"
  ON public.order_checklist_items FOR DELETE
  TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_order_checklist_items_order_id ON public.order_checklist_items(order_id);
