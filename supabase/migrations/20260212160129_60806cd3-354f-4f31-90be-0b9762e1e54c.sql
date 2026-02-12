
-- 1. Quote revision tracking
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS parent_quote_id uuid REFERENCES public.quotes(id);

-- Index for finding revisions of a quote
CREATE INDEX IF NOT EXISTS idx_quotes_parent_quote_id ON public.quotes(parent_quote_id);

-- 2. Product override protection on reimport
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_override jsonb DEFAULT NULL;

-- 3. Service ticket status validation trigger
CREATE OR REPLACE FUNCTION public.validate_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Block "afgerond" if previous status was a waiting status without intermediate resolution
  IF NEW.status = 'afgerond' AND OLD.status IN ('wacht_op_klant', 'wacht_op_onderdelen') THEN
    RAISE EXCEPTION 'Ticket kan niet direct van "%" naar "Afgerond". Verwerk eerst de openstaande actie.', OLD.status;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_ticket_status
  BEFORE UPDATE ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ticket_status_change();
