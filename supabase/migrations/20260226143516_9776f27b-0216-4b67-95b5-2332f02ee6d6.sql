
-- Stap 1: Verwijder token-gerelateerde kolommen (worden niet meer lokaal opgeslagen)
ALTER TABLE public.exact_online_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS token_expires_at;

-- Stap 2: Voeg SiteJob Connect kolommen toe
ALTER TABLE public.exact_online_connections
  ADD COLUMN IF NOT EXISTS tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'nl';
