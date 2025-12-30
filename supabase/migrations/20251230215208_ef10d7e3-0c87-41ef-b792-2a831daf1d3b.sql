-- Create analytics events table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Index for efficient querying
CREATE INDEX idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_category ON public.analytics_events(event_category);

-- RLS Policies
-- Users can insert their own events (or anonymous events with null user_id)
CREATE POLICY "Users can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Admins can view all analytics events
CREATE POLICY "Admins can view all analytics events"
ON public.analytics_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add analytics_enabled to profiles for opt-out
ALTER TABLE public.profiles ADD COLUMN analytics_enabled BOOLEAN DEFAULT true;