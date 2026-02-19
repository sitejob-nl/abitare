
-- WhatsApp Business API credentials opslag
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text NOT NULL,
  access_token text NOT NULL,
  display_phone text,
  waba_id text,
  updated_at timestamptz DEFAULT now()
);

-- RLS enabled zonder policies = alleen service_role kan erbij
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
