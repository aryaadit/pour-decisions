-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate the view with security_invoker = false
-- This allows the view to bypass RLS on the underlying profiles table
CREATE VIEW public.profiles_public
WITH (security_invoker = false) AS
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