
-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs every minute to send scheduled posts
SELECT cron.schedule(
  'send-scheduled-posts',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://kqvpyhjmoasaqxiqbiap.supabase.co/functions/v1/send-telegram-message',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdnB5aGptb2FzYXF4aXFiaWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTUwMTMsImV4cCI6MjA2NTQ3MTAxM30.kkVsZxuTj8dgWEB2UxSixFOgRuDZavWKQC5JCUBB_fs"}'::jsonb,
        body:='{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);
