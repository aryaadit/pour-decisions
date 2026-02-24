-- RPC to fetch the most recent drink log matching a name+type,
-- used when tapping a discovery card on the Feed page.
-- SECURITY DEFINER so it bypasses RLS (discovery drinks should be
-- viewable regardless of the logger's activity_visibility setting).

CREATE OR REPLACE FUNCTION public.get_discovery_drink_detail(
  drink_name text,
  drink_type text
)
RETURNS TABLE (
  drink_id uuid,
  name text,
  type text,
  brand text,
  rating integer,
  notes text,
  location text,
  price text,
  image_url text,
  date_added timestamptz,
  owner_user_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id        AS drink_id,
    d.name,
    d.type,
    d.brand,
    d.rating,
    d.notes,
    d.location,
    d.price,
    d.image_url,
    d.date_added,
    d.user_id   AS owner_user_id,
    p.username  AS owner_username,
    p.display_name AS owner_display_name,
    p.avatar_url   AS owner_avatar_url
  FROM activity_feed af
  JOIN drinks d ON d.id = af.drink_id
  JOIN profiles p ON p.user_id = d.user_id
  WHERE af.activity_type = 'drink_added'
    AND lower(d.name) = lower(drink_name)
    AND lower(d.type) = lower(drink_type)
  ORDER BY af.created_at DESC
  LIMIT 1;
$$;
