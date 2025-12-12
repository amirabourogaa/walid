-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule automatic transaction archiving on the 1st of each month at 00:05
SELECT cron.schedule(
  'archive-transactions-monthly',
  '5 0 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://wuulfgekzffpwdxkwwzi.supabase.co/functions/v1/archive-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWxmZ2VremZmcHdkeGt3d3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5Nzk2NjgsImV4cCI6MjA3NDU1NTY2OH0.U7En8uut6OIadTYftO7EMpxqQleF8YSXRK2ZmHEaBnU"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);