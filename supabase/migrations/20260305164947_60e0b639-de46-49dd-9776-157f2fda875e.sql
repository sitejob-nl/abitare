-- Schedule exact-process-queue to run every 5 minutes
SELECT cron.schedule(
  'exact-process-queue-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/exact-process-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnF4c3BhYW16aHRneGh2bGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODgzOTIsImV4cCI6MjA4NTM2NDM5Mn0.GOrfHdV_Vahceqmmn8MajLLJbQan3TF6iQOHB-lGQeA"}'::jsonb,
    body:='{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);