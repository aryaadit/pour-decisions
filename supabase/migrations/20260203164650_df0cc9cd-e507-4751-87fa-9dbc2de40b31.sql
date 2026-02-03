-- Fix #1: Remove overly permissive SELECT policy on profiles table
-- The profiles_public view should be the only way to access public profile data
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Fix #2: Create a secure view for public collection drinks that limits exposed data
-- This view only exposes the minimum necessary fields for viewing public collections
CREATE OR REPLACE VIEW public.collection_drinks_public
WITH (security_invoker = on) AS
SELECT 
    cd.collection_id,
    cd.drink_id,
    cd.position,
    cd.added_at
FROM public.collection_drinks cd
INNER JOIN public.collections c ON c.id = cd.collection_id
WHERE c.is_public = true;

-- Remove the overly permissive policy that exposes drink_id references
DROP POLICY IF EXISTS "Users can view drinks in public collections" ON public.collection_drinks;