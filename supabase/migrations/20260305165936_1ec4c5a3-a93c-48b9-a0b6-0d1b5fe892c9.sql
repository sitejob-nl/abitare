
-- WhatsApp Send Queue table for automated messages
CREATE TABLE IF NOT EXISTS public.whatsapp_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'nl',
  template_params jsonb DEFAULT '[]'::jsonb,
  trigger_status text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  external_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.whatsapp_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on whatsapp_send_queue"
  ON public.whatsapp_send_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_whatsapp_send_queue_status ON public.whatsapp_send_queue(status);

-- WhatsApp auto-template settings: which statuses trigger which templates
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_status text NOT NULL UNIQUE,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'nl',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_auto_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read whatsapp_auto_templates"
  ON public.whatsapp_auto_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default auto-template mappings (inactive by default, admin enables)
INSERT INTO public.whatsapp_auto_templates (order_status, template_name, is_active) VALUES
  ('montage_gepland', 'montage_gepland', false),
  ('afgerond', 'order_afgerond', false)
ON CONFLICT (order_status) DO NOTHING;

-- Trigger function: on order status change, queue WhatsApp if template configured
CREATE OR REPLACE FUNCTION public.queue_whatsapp_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _template RECORD;
  _customer RECORD;
  _phone text;
BEGIN
  -- Only fire on status change
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Check if there's an active auto-template for this status
  SELECT * INTO _template
  FROM public.whatsapp_auto_templates
  WHERE order_status = NEW.status AND is_active = true;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get customer phone
  SELECT mobile, phone, first_name, last_name, company_name
  INTO _customer
  FROM public.customers
  WHERE id = NEW.customer_id;

  _phone := COALESCE(_customer.mobile, _customer.phone);

  IF _phone IS NULL OR _phone = '' THEN
    RETURN NEW;
  END IF;

  -- Queue the message
  INSERT INTO public.whatsapp_send_queue (
    order_id, customer_id, phone_number, template_name, template_language, trigger_status
  ) VALUES (
    NEW.id, NEW.customer_id, _phone, _template.template_name, _template.template_language, NEW.status
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_whatsapp_auto
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_whatsapp_on_status_change();

-- PIMS queue improvements: add retry_count, reset stuck processing
ALTER TABLE public.pims_image_queue ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

UPDATE public.pims_image_queue
SET status = 'pending', retry_count = retry_count + 1
WHERE status = 'processing'
  AND (processed_at IS NULL OR processed_at < now() - interval '1 hour');
