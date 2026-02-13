
-- Create projects table (dossier container)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number SERIAL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  division_id UUID REFERENCES public.divisions(id),
  name TEXT,
  status TEXT NOT NULL DEFAULT 'actief',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tables: division-scoped)
CREATE POLICY "Users can view projects in their division"
  ON public.projects FOR SELECT
  USING (
    division_id IS NULL 
    OR division_id = public.get_user_division_id(auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_admin_or_manager(auth.uid()));

-- Add project_id FK to quotes
ALTER TABLE public.quotes ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Add project_id FK to orders
ALTER TABLE public.orders ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Add project_id FK to service_tickets
ALTER TABLE public.service_tickets ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create work_report_damages table for hard-blocking damage flow
CREATE TABLE public.work_report_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES public.order_lines(id),
  description TEXT NOT NULL,
  position TEXT,
  measurements TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_report_damages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view damages"
  ON public.work_report_damages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create damages"
  ON public.work_report_damages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update damages"
  ON public.work_report_damages FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete damages"
  ON public.work_report_damages FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add has_damage flag to work_reports
ALTER TABLE public.work_reports ADD COLUMN has_damage BOOLEAN DEFAULT false;
