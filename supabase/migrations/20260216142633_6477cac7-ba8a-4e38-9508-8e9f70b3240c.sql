
-- Queue table for background image processing
CREATE TABLE public.pims_image_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  article_code TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  batch_id UUID
);

-- Index for efficient batch fetching
CREATE INDEX idx_pims_image_queue_status ON public.pims_image_queue(status) WHERE status = 'pending';
CREATE INDEX idx_pims_image_queue_batch ON public.pims_image_queue(batch_id) WHERE batch_id IS NOT NULL;

-- RLS disabled: only service role accesses this table
ALTER TABLE public.pims_image_queue ENABLE ROW LEVEL SECURITY;
