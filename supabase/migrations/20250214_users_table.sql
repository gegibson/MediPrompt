-- Stage 2 — Supabase users table and policies
-- Apply in your Supabase project's SQL editor or via `supabase db push`.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  is_subscriber boolean not null default false,
  subscribed_at timestamptz
);

alter table public.users enable row level security;

drop policy if exists "Users can read their own record" on public.users;
create policy "Users can read their own record" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Service role manages subscriptions" on public.users;
create policy "Service role manages subscriptions" on public.users
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Optional: ensure existing auth users have a corresponding profile row
insert into public.users (id, email)
select id, email
from auth.users
where id not in (select id from public.users);
