-- Create a public view for drinks that respects activity visibility settings
-- This allows other users to see drinks from users with public/followers-only visibility
CREATE OR REPLACE VIEW public.drinks_public 
WITH (security_invoker = true) AS
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
    AND EXISTS (
      SELECT 1 FROM public.follows f 
      WHERE f.following_id = d.user_id 
        AND f.follower_id = auth.uid()
        AND f.status = 'accepted'
    )
  );