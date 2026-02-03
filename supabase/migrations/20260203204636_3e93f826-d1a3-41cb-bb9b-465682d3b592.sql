-- Fix: Remove the policy that exposes user_id through public collections
-- The collections_public view should be used instead for public access (it excludes user_id)
DROP POLICY IF EXISTS "Anyone can view public collections" ON public.collections;