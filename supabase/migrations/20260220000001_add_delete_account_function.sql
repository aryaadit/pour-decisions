-- Delete user account function
-- Called via supabase.rpc('delete_user_account') from the client.
-- SECURITY DEFINER so it can delete from auth.users on behalf of the caller.
-- All user data in public tables cascades automatically via foreign keys.

create or replace function public.delete_user_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Only authenticated users can call this, and it only ever deletes the calling user.
revoke all on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;
