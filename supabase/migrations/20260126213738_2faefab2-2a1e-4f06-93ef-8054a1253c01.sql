-- Update the create_drink_activity function to include notes in metadata
CREATE OR REPLACE FUNCTION public.create_drink_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create activity for non-wishlist drinks (actual logged drinks)
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_wishlist = false THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'drink_added', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'rating', NEW.rating,
        'image_url', NEW.image_url,
        'notes', NEW.notes,
        'location', NEW.location
      ));
    ELSIF NEW.is_wishlist = true THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'wishlist_added', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'image_url', NEW.image_url
      ));
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log rating changes for logged drinks
    IF OLD.rating IS DISTINCT FROM NEW.rating AND NEW.is_wishlist = false AND NEW.rating IS NOT NULL THEN
      INSERT INTO public.activity_feed (user_id, activity_type, drink_id, metadata)
      VALUES (NEW.user_id, 'drink_rated', NEW.id, jsonb_build_object(
        'name', NEW.name,
        'type', NEW.type,
        'rating', NEW.rating,
        'old_rating', OLD.rating,
        'image_url', NEW.image_url,
        'notes', NEW.notes
      ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;