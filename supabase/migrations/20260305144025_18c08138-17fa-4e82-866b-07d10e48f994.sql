
-- Leave requests table
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'vakantie',
  status text NOT NULL DEFAULT 'aangevraagd',
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  division_id uuid REFERENCES public.divisions(id)
);

-- RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own + admins/managers see all
CREATE POLICY "Users can view own leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can insert own leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update leave requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can delete leave requests"
  ON public.leave_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

-- Add show_prices to quote_sections for per-section price visibility
ALTER TABLE public.quote_sections ADD COLUMN show_prices boolean DEFAULT true;

-- Add updated_at trigger for leave_requests
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
