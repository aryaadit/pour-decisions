-- Fix: Follow counts differ between own profile and other viewers.
-- The old policy only allowed reading follows where the current user
-- is the follower or the followed, so other users couldn't count
-- a profile's followers/following accurately.
-- Follow relationships are not private — allow any authenticated user to read.

DROP POLICY "Users can see their own follows" ON public.follows;

CREATE POLICY "Authenticated users can read follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (true);
