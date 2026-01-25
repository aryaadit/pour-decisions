-- Add is_system column to mark system-created collections (like Wishlist)
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Create function to get or create the Wishlist collection for a user
CREATE OR REPLACE FUNCTION public.get_or_create_wishlist_collection(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _collection_id uuid;
BEGIN
  -- Try to find existing Wishlist collection
  SELECT id INTO _collection_id
  FROM public.collections
  WHERE user_id = _user_id 
    AND is_system = true 
    AND name = 'Wishlist';
  
  -- If not found, create it
  IF _collection_id IS NULL THEN
    INSERT INTO public.collections (user_id, name, description, icon, cover_color, is_system)
    VALUES (_user_id, 'Wishlist', 'Drinks you want to try', '⭐', '#F59E0B', true)
    RETURNING id INTO _collection_id;
  END IF;
  
  RETURN _collection_id;
END;
$$;

-- Create trigger function to sync wishlist drinks with Wishlist collection
CREATE OR REPLACE FUNCTION public.sync_wishlist_to_collection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create the trigger on the drinks table
DROP TRIGGER IF EXISTS sync_wishlist_collection_trigger ON public.drinks;
CREATE TRIGGER sync_wishlist_collection_trigger
AFTER INSERT OR UPDATE ON public.drinks
FOR EACH ROW
EXECUTE FUNCTION public.sync_wishlist_to_collection();

-- Prevent deletion of system collections
CREATE OR REPLACE FUNCTION public.prevent_system_collection_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system collection';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_system_collection_delete_trigger ON public.collections;
CREATE TRIGGER prevent_system_collection_delete_trigger
BEFORE DELETE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.prevent_system_collection_delete();

-- Backfill: Create Wishlist collections and sync existing wishlist drinks for all users
DO $$
DECLARE
  _user RECORD;
  _wishlist_id uuid;
BEGIN
  FOR _user IN SELECT DISTINCT user_id FROM public.drinks WHERE is_wishlist = true LOOP
    -- Get or create Wishlist collection
    _wishlist_id := public.get_or_create_wishlist_collection(_user.user_id);
    
    -- Add all wishlist drinks to the collection
    INSERT INTO public.collection_drinks (collection_id, drink_id)
    SELECT _wishlist_id, d.id
    FROM public.drinks d
    WHERE d.user_id = _user.user_id AND d.is_wishlist = true
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;