-- 002_profiles.sql
-- Profiles, the admin predicate, and the auth trigger.
--
-- is_admin() lives here rather than with the other helpers because every RLS
-- policy in 010 calls it — it has to exist before the policies do.

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'viewer'
              check (role in ('admin', 'editor', 'viewer')),
  full_name   text,
  avatar_key  text,
  created_at  timestamptz not null default now()
);

comment on table profiles is
  'One row per auth user. There is no self-serve signup; the single admin is '
  'promoted once by hand after their first magic-link sign-in.';

-- ---------------------------------------------------------------------------
-- Admin predicate — the single definition of "is this caller an admin".
--
-- SECURITY DEFINER so the policy can read `profiles` without recursing through
-- `profiles`' own RLS. search_path is pinned, which is required for any
-- SECURITY DEFINER function.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Every new auth user gets a 'viewer' profile. Promotion to admin is manual:
--   update profiles set role = 'admin' where id = '<uuid>';
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
