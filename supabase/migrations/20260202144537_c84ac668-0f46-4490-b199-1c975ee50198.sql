-- Add webhooks_enabled to connections
ALTER TABLE public.exact_online_connections
ADD COLUMN IF NOT EXISTS webhooks_enabled BOOLEAN DEFAULT false;

-- Create webhook logs table
CREATE TABLE public.exact_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.exact_online_connections(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  action TEXT NOT NULL,
  exact_division INTEGER,
  entity_key TEXT,
  endpoint TEXT,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exact_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
ON public.exact_webhook_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Service role can insert (for edge function)
CREATE POLICY "Service role can insert webhook logs"
ON public.exact_webhook_logs
FOR INSERT
WITH CHECK (true);

-- Service role can update webhook logs
CREATE POLICY "Service role can update webhook logs"
ON public.exact_webhook_logs
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_webhook_logs_connection ON public.exact_webhook_logs(connection_id);
CREATE INDEX idx_webhook_logs_processed ON public.exact_webhook_logs(processed) WHERE NOT processed;