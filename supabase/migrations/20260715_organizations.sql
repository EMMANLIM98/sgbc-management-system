-- Create organizations table to manage available organization options
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.organizations enable row level security;

-- Allow public read access to active organizations (for auth form)
create policy "organizations_public_read" on public.organizations
  for select
  using (is_active = true);

-- Insert initial organizations (alphabetically sorted)
insert into public.organizations (name, is_active) values
  ('SGBC - Antipolo', true),
  ('SGBC - Angono', true),
  ('SGBC - Baras', true),
  ('SGBC - Boracay', true),
  ('SGBC - Cainta', true),
  ('SGBC - Morong', true),
  ('SGBC - Taytay', true)
on conflict (name) do nothing;
