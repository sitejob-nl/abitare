
-- ============================================================
-- 1) Extend order status trigger: validate mandatory fields at "controle"
-- ============================================================
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
  v_has_documents boolean;
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

  -- Gate 4 (NEW): Controle requires mandatory fields and at least 1 document
  IF NEW.status = 'controle' THEN
    -- Check mandatory address fields
    IF NEW.installation_street_address IS NULL OR NEW.installation_street_address = '' THEN
      RAISE EXCEPTION 'Montageadres is verplicht voordat de order naar "Controle" kan.';
    END IF;
    IF NEW.installation_postal_code IS NULL OR NEW.installation_postal_code = '' THEN
      RAISE EXCEPTION 'Montage postcode is verplicht voordat de order naar "Controle" kan.';
    END IF;
    IF NEW.installation_city IS NULL OR NEW.installation_city = '' THEN
      RAISE EXCEPTION 'Montage plaats is verplicht voordat de order naar "Controle" kan.';
    END IF;

    -- Check at least 1 document exists
    SELECT EXISTS (
      SELECT 1 FROM public.order_documents WHERE order_id = NEW.id
    ) INTO v_has_documents;

    IF NOT v_has_documents THEN
      RAISE EXCEPTION 'Er moet minimaal 1 document zijn geüpload voordat de order naar "Controle" kan.';
    END IF;
  END IF;

  -- Log normal status change
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2) Auto-create service ticket when work report with damage is submitted
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_damage_service_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_name text;
  v_order_number integer;
  v_ticket_subject text;
  v_ticket_description text;
  v_submitter_email text;
BEGIN
  -- Only fire when status changes to 'ingediend' and has_damage is true
  IF NEW.status != 'ingediend' OR OLD.status = 'ingediend' THEN
    RETURN NEW;
  END IF;

  IF NEW.has_damage IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get customer info
  SELECT
    COALESCE(c.company_name, CONCAT(COALESCE(c.first_name, ''), ' ', c.last_name)),
    COALESCE(c.email, 'noreply@system.local')
  INTO v_customer_name, v_submitter_email
  FROM public.customers c
  WHERE c.id = NEW.customer_id;

  -- Get order number
  SELECT o.order_number INTO v_order_number
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  v_ticket_subject := 'Schade bij montage - Order #' || COALESCE(v_order_number::text, 'onbekend');
  v_ticket_description := 'Automatisch aangemaakt vanuit werkbon WB-' || NEW.report_number || '. Monteur heeft schade geconstateerd tijdens montage.';

  INSERT INTO public.service_tickets (
    division_id,
    order_id,
    customer_id,
    status,
    priority,
    category,
    subject,
    description,
    submitter_name,
    submitter_email,
    created_by
  ) VALUES (
    NEW.division_id,
    NEW.order_id,
    NEW.customer_id,
    'nieuw',
    'hoog',
    'schade',
    v_ticket_subject,
    v_ticket_description,
    COALESCE(v_customer_name, 'Onbekend'),
    COALESCE(v_submitter_email, 'noreply@system.local'),
    NEW.installer_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_damage_service_ticket ON public.work_reports;
CREATE TRIGGER trg_auto_damage_service_ticket
  AFTER UPDATE ON public.work_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_damage_service_ticket();
