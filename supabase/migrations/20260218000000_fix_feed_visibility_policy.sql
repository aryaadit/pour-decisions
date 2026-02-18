-- Fix activity feed visibility policy
--
-- The old policy required is_following() for ALL visibility levels,
-- which meant public profiles' activity was never shown to non-followers.
--
-- The correct logic:
--   - 'public'    → visible to everyone (no follow required)
--   - 'followers' → visible only to users who follow the author
--   - 'private'   → never visible to others (excluded implicitly)
--
-- The "Users can see their own activity" policy (auth.uid() = user_id)
-- remains unchanged so users always see their own activity elsewhere.

DROP POLICY IF EXISTS "Users can see followed users activity" ON public.activity_feed;

CREATE POLICY "Users can see activity based on visibility"
  ON public.activity_feed FOR SELECT
  USING (
    public.get_activity_visibility(user_id) = 'public'
    OR (
      public.get_activity_visibility(user_id) = 'followers'
      AND public.is_following(auth.uid(), user_id)
    )
  );
