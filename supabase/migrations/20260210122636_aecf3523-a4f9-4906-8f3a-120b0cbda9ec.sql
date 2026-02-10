-- Add 'klaar_voor_planning' to the service_ticket_status enum (before 'ingepland')
ALTER TYPE public.service_ticket_status ADD VALUE IF NOT EXISTS 'klaar_voor_planning' BEFORE 'ingepland';