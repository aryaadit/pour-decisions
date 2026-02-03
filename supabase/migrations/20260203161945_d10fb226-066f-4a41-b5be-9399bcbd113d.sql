-- Fix profiles_public view to use security_invoker=on (respects RLS)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
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

-- Add RLS policy to allow viewing public profiles by everyone
-- This works with the existing policies:
-- - "Users can view their own profile" (auth.uid() = user_id)
-- - "Admins can view all profiles" (has_role check)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (
    is_public = true 
    AND username IS NOT NULL
  );