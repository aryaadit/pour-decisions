-- Add follows table to Supabase Realtime publication
-- so the client can subscribe to follow INSERT/DELETE events
-- and update follower counts in real time.

ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
