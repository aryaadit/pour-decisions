-- Fix: Supabase Realtime DELETE events on follows table don't include
-- non-PK columns by default, so filters like following_id=eq.X silently
-- drop all DELETE events. REPLICA IDENTITY FULL sends all columns in
-- the old-row payload, allowing filters to work on DELETE.

ALTER TABLE public.follows REPLICA IDENTITY FULL;
