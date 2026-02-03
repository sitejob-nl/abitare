-- Create service_ticket_status enum
CREATE TYPE service_ticket_status AS ENUM (
  'nieuw',
  'in_behandeling',
  'wacht_op_klant',
  'wacht_op_onderdelen',
  'ingepland',
  'afgerond',
  'geannuleerd'
);

-- Create service_ticket_priority enum
CREATE TYPE service_ticket_priority AS ENUM (
  'laag',
  'normaal',
  'hoog',
  'urgent'
);

-- Create service_tickets table
CREATE TABLE public.service_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number SERIAL,
  division_id UUID REFERENCES public.divisions(id),
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID REFERENCES public.customers(id),
  status service_ticket_status NOT NULL DEFAULT 'nieuw',
  priority service_ticket_priority NOT NULL DEFAULT 'normaal',
  category TEXT NOT NULL DEFAULT 'overig',
  subject TEXT NOT NULL,
  description TEXT,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id)
);

-- Create service_ticket_assignees table
CREATE TABLE public.service_ticket_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(ticket_id, user_id)
);

-- Create service_ticket_notes table
CREATE TABLE public.service_ticket_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'intern',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_ticket_attachments table
CREATE TABLE public.service_ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_ticket_status_history table
CREATE TABLE public.service_ticket_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  from_status service_ticket_status,
  to_status service_ticket_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger for service_tickets
CREATE TRIGGER update_service_tickets_updated_at
  BEFORE UPDATE ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ticket_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ticket_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_tickets
-- SELECT: Authenticated users can see all tickets
CREATE POLICY "Authenticated users can view tickets"
  ON public.service_tickets FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Everyone (anon + authenticated) can create tickets (public form)
CREATE POLICY "Anyone can create tickets"
  ON public.service_tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE: Only authenticated users
CREATE POLICY "Authenticated users can update tickets"
  ON public.service_tickets FOR UPDATE
  TO authenticated
  USING (true);

-- DELETE: Only admins
CREATE POLICY "Only admins can delete tickets"
  ON public.service_tickets FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for service_ticket_assignees
CREATE POLICY "Authenticated users can view assignees"
  ON public.service_ticket_assignees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage assignees"
  ON public.service_ticket_assignees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignees"
  ON public.service_ticket_assignees FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete assignees"
  ON public.service_ticket_assignees FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for service_ticket_notes
CREATE POLICY "Authenticated users can view notes"
  ON public.service_ticket_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create notes"
  ON public.service_ticket_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update notes"
  ON public.service_ticket_notes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete notes"
  ON public.service_ticket_notes FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for service_ticket_attachments
CREATE POLICY "Authenticated users can view attachments"
  ON public.service_ticket_attachments FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can upload attachments (for public form)
CREATE POLICY "Anyone can upload attachments"
  ON public.service_ticket_attachments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update attachments"
  ON public.service_ticket_attachments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete attachments"
  ON public.service_ticket_attachments FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for service_ticket_status_history
CREATE POLICY "Authenticated users can view status history"
  ON public.service_ticket_status_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create status history"
  ON public.service_ticket_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create storage bucket for service attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-attachments', 'service-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for service-attachments bucket
CREATE POLICY "Authenticated users can view service attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'service-attachments');

CREATE POLICY "Anyone can upload service attachments"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'service-attachments');

CREATE POLICY "Authenticated users can update service attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'service-attachments');

CREATE POLICY "Authenticated users can delete service attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-attachments');