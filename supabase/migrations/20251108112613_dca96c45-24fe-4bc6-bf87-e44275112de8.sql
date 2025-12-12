-- Create cron job for monthly bank accounts archiving (runs on 1st of every month at 00:15)
SELECT cron.schedule(
  'archive-bank-accounts-monthly',
  '15 0 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://wuulfgekzffpwdxkwwzi.supabase.co/functions/v1/archive-bank-accounts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWxmZ2VremZmcHdkeGt3d3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5Nzk2NjgsImV4cCI6MjA3NDU1NTY2OH0.U7En8uut6OIadTYftO7EMpxqQleF8YSXRK2ZmHEaBnU"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);