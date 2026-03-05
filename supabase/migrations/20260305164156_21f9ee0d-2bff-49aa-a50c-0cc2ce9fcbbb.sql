-- Trigger function: when work_report status changes to 'ingediend', update linked order to 'gemonteerd'
CREATE OR REPLACE FUNCTION public.on_work_report_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes to 'ingediend'
  IF NEW.status = 'ingediend' AND (OLD.status IS DISTINCT FROM 'ingediend') THEN
    -- Update the linked order status to 'gemonteerd'
    UPDATE public.orders
    SET status = 'gemonteerd',
        updated_at = NOW()
    WHERE id = NEW.order_id
      AND status = 'montage_gepland';

    -- Log the status change
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
    SELECT NEW.order_id, 'montage_gepland', 'gemonteerd', NEW.installer_id, 
           'Automatisch bijgewerkt na indiening werkbon WB-' || NEW.report_number
    FROM public.orders
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on work_reports table
CREATE TRIGGER trg_work_report_submitted
  AFTER UPDATE ON public.work_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.on_work_report_submitted();