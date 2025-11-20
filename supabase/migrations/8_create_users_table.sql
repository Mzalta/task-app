-- Create users table to store user account information
-- This table works alongside profiles to meet the requirement for a users table
create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to sync user data from auth.users to public.users
create or replace function public.sync_user_to_users_table() 
returns trigger
security definer
set search_path = public
as $$
begin
  -- Insert or update user in users table
  insert into public.users (user_id, email, name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (user_id) 
  do update set
    email = excluded.email,
    name = coalesce(excluded.name, users.name),
    updated_at = now();
  
  return new;
end;
$$ language plpgsql;

-- Trigger to sync auth.users to public.users on insert
create trigger sync_user_on_auth_insert
  after insert on auth.users
  for each row execute procedure public.sync_user_to_users_table();

-- Trigger to sync auth.users to public.users on update
create trigger sync_user_on_auth_update
  after update on auth.users
  for each row execute procedure public.sync_user_to_users_table();

-- Backfill existing users from auth.users
insert into public.users (user_id, email, name, created_at, updated_at)
select 
  id,
  email,
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  now(),
  now()
from auth.users
on conflict (user_id) do nothing;

-- Security policy: Users can read their own user account
create policy "Users can read own user account"
on public.users for select
using (auth.uid() = user_id);

-- Security policy: Users can update their own user account
create policy "Users can update own user account"
on public.users for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Enable RLS
alter table public.users enable row level security;

-- Create index for efficient lookups
create index idx_users_email on public.users(email);

