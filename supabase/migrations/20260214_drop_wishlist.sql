-- Drop wishlist-related triggers, functions, and column

-- Drop the trigger that auto-creates wishlist collection
DROP TRIGGER IF EXISTS on_user_created_wishlist ON auth.users;
DROP FUNCTION IF EXISTS public.get_or_create_wishlist_collection(uuid);

-- Drop the is_wishlist column from drinks table
ALTER TABLE public.drinks DROP COLUMN IF EXISTS is_wishlist;
