
-- ============================================================
-- BLOCK 1A: Server-side order gate trigger
-- Mirrors orderGates.ts logic to prevent bypass via direct API
-- ============================================================

-- Add override columns to order_status_history
ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS overridden_by uuid;

-- Create the validation function
CREATE OR REPLACE FUNCTION public.validate_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_checklist_complete boolean;
  v_override_reason text;
  v_is_admin_or_manager boolean;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check for admin override via session variable
  BEGIN
    v_override_reason := current_setting('app.override_reason', true);
  EXCEPTION WHEN OTHERS THEN
    v_override_reason := NULL;
  END;

  -- Check if user is admin or manager
  v_is_admin_or_manager := public.is_admin_or_manager(auth.uid());

  -- If admin/manager provides override reason, allow and log
  IF v_override_reason IS NOT NULL AND v_override_reason != '' AND v_is_admin_or_manager THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes, override_reason, overridden_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Override: ' || v_override_reason, v_override_reason, auth.uid());
    RETURN NEW;
  END IF;

  -- Gate 1: Checklist must be complete before bestel_klaar
  IF NEW.status = 'bestel_klaar' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.order_checklist_items
      WHERE order_id = NEW.id AND checked = false
    ) INTO v_checklist_complete;

    IF NOT v_checklist_complete THEN
      RAISE EXCEPTION 'Niet alle checklist-items zijn afgevinkt. Status "Bestel klaar" is geblokkeerd.';
    END IF;
  END IF;

  -- Gate 2: Deposit payment required before bestel_klaar or besteld
  IF NEW.status IN ('bestel_klaar', 'besteld') THEN
    IF NEW.deposit_required AND (NEW.payment_status IS NULL OR NEW.payment_status = 'open') THEN
      RAISE EXCEPTION 'Aanbetaling moet (deels) betaald zijn voordat deze status bereikt kan worden.';
    END IF;
  END IF;

  -- Gate 3: besteld requires previous status to be controle (vier-ogen principe)
  IF NEW.status = 'besteld' THEN
    IF OLD.status != 'controle' THEN
      RAISE EXCEPTION 'Order moet eerst de status "Controle" hebben gehad (vier-ogen principe).';
    END IF;
  END IF;

  -- Log normal status change
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_status_change();

-- ============================================================
-- BLOCK 1B: Communication log table
-- Central log for all emails/messages linked to customer/order/ticket
-- ============================================================

-- Create enum types
DO $$ BEGIN
  CREATE TYPE public.communication_type AS ENUM ('email', 'whatsapp', 'note');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create the table
CREATE TABLE IF NOT EXISTS public.communication_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type public.communication_type NOT NULL DEFAULT 'email',
  direction public.communication_direction NOT NULL DEFAULT 'outbound',
  subject text,
  body_preview text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ticket_id uuid REFERENCES public.service_tickets(id) ON DELETE SET NULL,
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid,
  external_message_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communication_log_customer ON public.communication_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_order ON public.communication_log(order_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_ticket ON public.communication_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_sent_at ON public.communication_log(sent_at DESC);

-- Enable RLS
ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read logs from their division or unscoped
CREATE POLICY "Users can view communication logs"
  ON public.communication_log FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      public.is_admin(auth.uid())
      OR division_id IS NULL
      OR division_id = public.get_user_division_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert communication logs"
  ON public.communication_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Import logs table for tracking product import history
CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual_upload',
  file_name text,
  total_rows integer DEFAULT 0,
  inserted integer DEFAULT 0,
  updated integer DEFAULT 0,
  skipped integer DEFAULT 0,
  errors integer DEFAULT 0,
  error_details jsonb DEFAULT '[]',
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view import logs"
  ON public.import_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert import logs"
  ON public.import_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
