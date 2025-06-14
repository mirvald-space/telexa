
-- Create table for storing scheduled posts
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  image_url TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  chat_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing bot configuration
CREATE TABLE public.bot_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_scheduled_time ON public.posts(scheduled_time);

-- Enable Row Level Security (RLS) - making tables public for now since no auth is implemented
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since no authentication is implemented yet)
CREATE POLICY "Allow all operations on posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on bot_configs" ON public.bot_configs FOR ALL USING (true) WITH CHECK (true);
