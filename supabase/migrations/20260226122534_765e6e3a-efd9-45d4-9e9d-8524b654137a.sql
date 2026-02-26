
-- Table to track @mentions in service ticket notes
CREATE TABLE public.user_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.service_ticket_notes(id) ON DELETE CASCADE,
  content_preview TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_mentions ENABLE ROW LEVEL SECURITY;

-- Users can see their own mentions
CREATE POLICY "Users can view their own mentions"
ON public.user_mentions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Authenticated users can create mentions
CREATE POLICY "Authenticated users can create mentions"
ON public.user_mentions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = mentioned_by);

-- Users can update (mark read) their own mentions
CREATE POLICY "Users can update their own mentions"
ON public.user_mentions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_user_mentions_user_id ON public.user_mentions(user_id);
CREATE INDEX idx_user_mentions_ticket_id ON public.user_mentions(ticket_id);
CREATE INDEX idx_user_mentions_unread ON public.user_mentions(user_id, is_read) WHERE is_read = false;
