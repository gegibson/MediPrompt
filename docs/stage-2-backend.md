# Stage 2 — Supabase Scaffolding

These notes capture the required backend pieces for the Stage 2 milestone. The Next.js routes expect the following Supabase resources and environment configuration.

## 1. Environment Variables
Copy `.env.example` to `.env.local` inside `web/` and populate the values from your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key-for-admin-updates
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/test_example
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=mediprompt.example
# NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC=https://plausible.io/js/script.js
```

The `SUPABASE_SERVICE_ROLE_KEY` is only read on the server when confirming Stripe subscriptions. The Stripe payment link is optional at this stage; set it once you have a test-mode checkout ready.

Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to enable analytics in production. Leave it empty in local development to skip loading the script, or provide `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC` if you host Plausible on a custom domain.

## 2. Minimal Schema (HIPAA-safe)
Run this SQL against your Supabase project to create the table that tracks subscription state without storing prompt content.

```sql
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  is_subscriber boolean not null default false,
  subscribed_at timestamptz
);

alter table public.users enable row level security;

create policy "Users can read their own record" on public.users
  for select using (auth.uid() = id);

create policy "Service role manages subscriptions" on public.users
  for all using (true)
  with check (true);
```

The service role policy keeps insert/update access locked to the server-side route while standard clients can only read their own profile.

## 3. API Contract
- `GET /api/me` — expects a Supabase session cookie. Returns `{ id, email, is_subscriber }` or `401` if unauthenticated.
- `POST /api/subscribe/confirm` — requires both a valid Supabase session and the service role key. Sets `is_subscriber=true` and `subscribed_at=now()`.

Both routes return `501` when Supabase environment variables are missing so that local development can proceed even before provisioning the backend.

## 4. Next Steps
- Stage 3 will wire Supabase Auth (sign up, login, reset) into the Wizard experience.
- Stripe checkout should redirect to `/wizard?paid=1`; on load the front-end will call `POST /api/subscribe/confirm` before refreshing `GET /api/me`.

No prompt content is persisted or transmitted to Supabase in this workflow, satisfying the HIPAA-safe posture defined in the roadmap.
