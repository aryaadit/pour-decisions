-- Create a view for public collections that excludes user_id
-- This prevents user ID enumeration when viewing shared collections
CREATE VIEW public.collections_public
WITH (security_invoker=on) AS
SELECT 
  id,
  share_id,
  is_public,
  created_at,
  updated_at,
  name,
  description,
  icon,
  cover_color
FROM public.collections
WHERE is_public = true;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.collections_public TO anon;
GRANT SELECT ON public.collections_public TO authenticated;