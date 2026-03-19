
-- 1. Add time columns to leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS start_time time WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_time time WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_partial_day boolean NOT NULL DEFAULT false;

-- 2. Create work_schedules table
CREATE TABLE public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time WITHOUT TIME ZONE NOT NULL DEFAULT '08:00',
  end_time time WITHOUT TIME ZONE NOT NULL DEFAULT '17:00',
  is_working_day boolean NOT NULL DEFAULT true,
  break_minutes integer NOT NULL DEFAULT 30,
  division_id uuid REFERENCES public.divisions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- 3. RLS for work_schedules
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own schedule"
  ON public.work_schedules FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can insert schedules"
  ON public.work_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update schedules"
  ON public.work_schedules FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete schedules"
  ON public.work_schedules FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- 4. Updated_at trigger
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
