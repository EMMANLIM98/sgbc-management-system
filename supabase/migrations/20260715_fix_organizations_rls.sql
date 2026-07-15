-- Fix organizations table RLS
-- Disable RLS entirely to allow public read access
alter table public.organizations disable row level security;

-- Ensure all organizations are marked as active (if column exists)
alter table public.organizations 
  add column if not exists is_active boolean default true;

update public.organizations set is_active = true where is_active is null;

