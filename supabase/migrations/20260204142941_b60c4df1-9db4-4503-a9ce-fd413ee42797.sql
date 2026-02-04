-- Create enums for work reports
CREATE TYPE public.work_report_status AS ENUM ('concept', 'ingediend', 'goedgekeurd');
CREATE TYPE public.work_report_photo_type AS ENUM ('voor', 'tijdens', 'na', 'schade');

-- Create work_reports table (Werkbonnen)
CREATE TABLE public.work_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_number SERIAL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  installer_id UUID NOT NULL,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  status public.work_report_status NOT NULL DEFAULT 'concept',
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  total_hours DECIMAL(5,2),
  work_description TEXT,
  materials_used TEXT,
  internal_notes TEXT,
  customer_signature TEXT,
  customer_name_signed TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_report_photos table
CREATE TABLE public.work_report_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  caption TEXT,
  photo_type public.work_report_photo_type NOT NULL DEFAULT 'tijdens',
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_report_tasks table
CREATE TABLE public.work_report_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create updated_at trigger for work_reports
CREATE TRIGGER update_work_reports_updated_at
  BEFORE UPDATE ON public.work_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_report_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_reports
CREATE POLICY "work_reports_select" ON public.work_reports
  FOR SELECT TO authenticated
  USING (
    installer_id = auth.uid()
    OR is_admin_or_manager(auth.uid())
    OR division_id = get_user_division_id(auth.uid())
  );

CREATE POLICY "work_reports_insert" ON public.work_reports
  FOR INSERT TO authenticated
  WITH CHECK (installer_id = auth.uid());

CREATE POLICY "work_reports_update" ON public.work_reports
  FOR UPDATE TO authenticated
  USING (
    (installer_id = auth.uid() AND status = 'concept')
    OR is_admin_or_manager(auth.uid())
  );

CREATE POLICY "work_reports_delete" ON public.work_reports
  FOR DELETE TO authenticated
  USING (
    (installer_id = auth.uid() AND status = 'concept')
    OR is_admin(auth.uid())
  );

-- RLS Policies for work_report_photos
CREATE POLICY "work_report_photos_select" ON public.work_report_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_photos.work_report_id
      AND (
        wr.installer_id = auth.uid()
        OR is_admin_or_manager(auth.uid())
        OR wr.division_id = get_user_division_id(auth.uid())
      )
    )
  );

CREATE POLICY "work_report_photos_insert" ON public.work_report_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_photos.work_report_id
      AND wr.installer_id = auth.uid()
    )
  );

CREATE POLICY "work_report_photos_delete" ON public.work_report_photos
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR is_admin(auth.uid())
  );

-- RLS Policies for work_report_tasks
CREATE POLICY "work_report_tasks_select" ON public.work_report_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_tasks.work_report_id
      AND (
        wr.installer_id = auth.uid()
        OR is_admin_or_manager(auth.uid())
        OR wr.division_id = get_user_division_id(auth.uid())
      )
    )
  );

CREATE POLICY "work_report_tasks_insert" ON public.work_report_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_tasks.work_report_id
      AND wr.installer_id = auth.uid()
    )
  );

CREATE POLICY "work_report_tasks_update" ON public.work_report_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_tasks.work_report_id
      AND (
        wr.installer_id = auth.uid()
        OR is_admin_or_manager(auth.uid())
      )
    )
  );

CREATE POLICY "work_report_tasks_delete" ON public.work_report_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_tasks.work_report_id
      AND (
        wr.installer_id = auth.uid()
        OR is_admin(auth.uid())
      )
    )
  );

-- Create storage bucket for work report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-report-photos', 'work-report-photos', false);

-- Storage policies for work-report-photos bucket
CREATE POLICY "Installers can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work-report-photos');

CREATE POLICY "Authenticated users can view photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'work-report-photos');

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'work-report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add index for faster queries
CREATE INDEX idx_work_reports_installer_id ON public.work_reports(installer_id);
CREATE INDEX idx_work_reports_order_id ON public.work_reports(order_id);
CREATE INDEX idx_work_reports_status ON public.work_reports(status);
CREATE INDEX idx_work_report_photos_report_id ON public.work_report_photos(work_report_id);