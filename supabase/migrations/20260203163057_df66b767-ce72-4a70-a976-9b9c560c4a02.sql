-- Fix sync_wishlist_to_collection to set search_path
CREATE OR REPLACE FUNCTION public.sync_wishlist_to_collection()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  _wishlist_collection_id uuid;
BEGIN
  -- Get or create the user's Wishlist collection
  _wishlist_collection_id := public.get_or_create_wishlist_collection(NEW.user_id);
  
  IF TG_OP = 'INSERT' THEN
    -- If drink is added to wishlist, add to collection
    IF NEW.is_wishlist = true THEN
      INSERT INTO public.collection_drinks (collection_id, drink_id)
      VALUES (_wishlist_collection_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle wishlist status change
    IF OLD.is_wishlist IS DISTINCT FROM NEW.is_wishlist THEN
      IF NEW.is_wishlist = true THEN
        -- Add to Wishlist collection
        INSERT INTO public.collection_drinks (collection_id, drink_id)
        VALUES (_wishlist_collection_id, NEW.id)
        ON CONFLICT DO NOTHING;
      ELSE
        -- Remove from Wishlist collection
        DELETE FROM public.collection_drinks
        WHERE collection_id = _wishlist_collection_id AND drink_id = NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix prevent_system_collection_delete to set search_path
CREATE OR REPLACE FUNCTION public.prevent_system_collection_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system collection';
  END IF;
  RETURN OLD;
END;
$function$;