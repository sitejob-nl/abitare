-- Create table for user-specific Microsoft connections
CREATE TABLE public.microsoft_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,
  microsoft_user_id TEXT,
  microsoft_email TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.microsoft_connections ENABLE ROW LEVEL SECURITY;

-- RLS: users can only view their own connection
CREATE POLICY "Users can view own microsoft connection"
ON public.microsoft_connections FOR SELECT
USING (auth.uid() = user_id);

-- RLS: users can delete their own connection
CREATE POLICY "Users can delete own microsoft connection"
ON public.microsoft_connections FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_microsoft_connections_updated_at
  BEFORE UPDATE ON public.microsoft_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add outlook_event_id to orders for calendar sync (Fase 2)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS outlook_event_id TEXT;