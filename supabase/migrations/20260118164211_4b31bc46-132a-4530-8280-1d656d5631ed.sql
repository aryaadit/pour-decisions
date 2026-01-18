-- =============================================
-- PHASE 1: Social Features Database Foundation
-- =============================================

-- 1. Add social columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS activity_visibility text DEFAULT 'private' CHECK (activity_visibility IN ('private', 'followers', 'public'));

-- Create case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (LOWER(username));

-- 2. Create follows table for social graph
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS on follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Follows RLS policies
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can see their own follows"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 3. Create activity_feed table
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('drink_added', 'drink_rated', 'wishlist_added')),
  drink_id uuid REFERENCES public.drinks(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on activity_feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Create function to check if user follows another
CREATE OR REPLACE FUNCTION public.is_following(_follower_id uuid, _following_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = _follower_id
      AND following_id = _following_id
      AND status = 'accepted'
  )
$$;

-- Create function to get activity visibility for a user
CREATE OR REPLACE FUNCTION public.get_activity_visibility(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(activity_visibility, 'private')
  FROM public.profiles
  WHERE user_id = _user_id
$$;

-- Activity feed RLS policies
CREATE POLICY "Users can see their own activity"
  ON public.activity_feed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can see public activity"
  ON public.activity_feed FOR SELECT
  USING (public.get_activity_visibility(user_id) = 'public');

CREATE POLICY "Users can see followers-only activity if following"
  ON public.activity_feed FOR SELECT
  USING (
    public.get_activity_visibility(user_id) = 'followers'
    AND public.is_following(auth.uid(), user_id)
  );

CREATE POLICY "System can insert activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Create trigger to auto-populate activity feed on drink actions
CREATE OR REPLACE FUNCTION public.create_drink_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create activity for non-wishlist drinks (actual logged drinks)
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_wishlist = false THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'drink_added', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'rating', NEW.rating,
        'image_url', NEW.image_url
      ));
    ELSIF NEW.is_wishlist = true THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'wishlist_added', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'image_url', NEW.image_url
      ));
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log rating changes for logged drinks
    IF OLD.rating IS DISTINCT FROM NEW.rating AND NEW.is_wishlist = false AND NEW.rating IS NOT NULL THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'drink_rated', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'rating', NEW.rating,
        'old_rating', OLD.rating,
        'image_url', NEW.image_url
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_drink_activity
  AFTER INSERT OR UPDATE ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_drink_activity();

-- 5. Create privacy-safe view for public profiles
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_public,
  activity_visibility,
  created_at
FROM public.profiles
WHERE username IS NOT NULL;

-- Grant access to the profiles view
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS activity_feed_user_id_idx ON public.activity_feed (user_id);
CREATE INDEX IF NOT EXISTS activity_feed_created_at_idx ON public.activity_feed (created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username) WHERE username IS NOT NULL;