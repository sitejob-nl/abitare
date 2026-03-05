-- Exact sync queue for automatic synchronization
CREATE TABLE public.exact_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL DEFAULT 'upsert',
  division_id uuid REFERENCES public.divisions(id),
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.exact_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync queue" ON public.exact_sync_queue
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE INDEX idx_exact_sync_queue_status ON public.exact_sync_queue(status) WHERE status = 'pending';
CREATE INDEX idx_exact_sync_queue_table ON public.exact_sync_queue(table_name, record_id);

-- Trigger function to enqueue changes
CREATE OR REPLACE FUNCTION public.enqueue_exact_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_division_id uuid;
  v_has_connection boolean;
BEGIN
  -- Get division_id from the record
  v_division_id := NEW.division_id;
  
  -- Only enqueue if there's an active Exact connection for this division
  IF v_division_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.exact_online_connections
      WHERE division_id = v_division_id AND is_active = true
    ) INTO v_has_connection;
    
    IF v_has_connection THEN
      INSERT INTO public.exact_sync_queue (table_name, record_id, action, division_id)
      VALUES (TG_TABLE_NAME, NEW.id, TG_OP, v_division_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Triggers on customers, orders, quotes
CREATE TRIGGER trg_exact_sync_customers
  AFTER INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_exact_sync();

CREATE TRIGGER trg_exact_sync_orders
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_exact_sync();

CREATE TRIGGER trg_exact_sync_quotes
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_exact_sync();