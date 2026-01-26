
-- Drop and recreate the drinks_public view
-- Use security_invoker=false (the default, which is security definer behavior)
-- This allows the view to bypass RLS on the base drinks table

DROP VIEW IF EXISTS public.drinks_public;

CREATE VIEW public.drinks_public AS
SELECT 
  d.id,
  d.user_id,
  d.name,
  d.type,
  d.rating,
  d.image_url,
  d.date_added,
  d.is_wishlist,
  d.brand,
  d.created_at
FROM public.drinks d
JOIN public.profiles p ON p.user_id = d.user_id
WHERE 
  -- User can always see their own drinks
  d.user_id = auth.uid()
  -- Or drinks from users with public visibility
  OR p.activity_visibility = 'public'
  -- Or drinks from users with followers visibility (if following)
  OR (
    p.activity_visibility = 'followers' 
    AND public.is_following(auth.uid(), d.user_id)
  );

-- Grant access to the view
GRANT SELECT ON public.drinks_public TO authenticated;
GRANT SELECT ON public.drinks_public TO anon;
