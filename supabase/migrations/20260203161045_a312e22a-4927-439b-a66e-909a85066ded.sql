-- Remove the policy that allows anyone to view public collections directly
-- This prevents user_id exposure - public access should go through collections_public view
DROP POLICY IF EXISTS "Users can view public collections" ON public.collections;