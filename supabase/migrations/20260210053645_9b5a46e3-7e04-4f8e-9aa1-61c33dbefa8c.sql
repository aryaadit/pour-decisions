
-- Revoke anonymous access to the profiles_public view
REVOKE SELECT ON public.profiles_public FROM anon;

-- Ensure only authenticated users can access it
GRANT SELECT ON public.profiles_public TO authenticated;
