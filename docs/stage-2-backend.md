# Stage 2 — Supabase Scaffolding

These notes capture the required backend pieces for the Stage 2 milestone. The Next.js routes expect the following Supabase resources and environment configuration.

## 1. Environment Variables
Copy `.env.example` to `.env.local` inside `web/` and populate the values from your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key-for-admin-updates
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_PRICE_ID=price_from_stripe_dashboard
STRIPE_WEBHOOK_SECRET=whsec_from_stripe_cli    # optional until webhooks are wired
```

Only the `NEXT_PUBLIC_*` keys are exposed to the browser. The `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` are server-only secrets that power the subscription endpoints.

## 2. Minimal Schema (HIPAA-safe)
Run this SQL against your Supabase project to create the table that tracks subscription state without storing prompt content. The snippet is also checked in at `supabase/migrations/20250214_users_table.sql` if you prefer uploading a file or using the Supabase CLI.

```sql
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

-- Optional: backfill profiles for existing auth users
insert into public.users (id, email)
select id, email
from auth.users
where id not in (select id from public.users);
```

The service role policy keeps insert/update access locked to the server-side route while standard clients can only read their own profile.

### How to apply the migration
1. Open your Supabase project dashboard and navigate to **SQL Editor** ▸ **New query**.
2. Paste the SQL above (or upload `supabase/migrations/20250214_users_table.sql`) and run it against the `public` schema.
3. If you prefer the Supabase CLI, copy the file into your migrations folder and run `supabase db push` from your project root.
4. After executing the SQL, confirm the `public.users` table exists and that both policies are listed under **Auth ▸ Policies**.

Finally, make sure `.env.local` inside `web/` carries every key above so the Next.js API routes can reach Supabase and Stripe. Restart `npm run dev` any time you update those secrets.

### Verify the `/api/me` endpoint locally
1. Restart `npm run dev` so the updated environment variables are loaded.
2. Sign in through the Auth modal on `/wizard` (Supabase should set `sb-access-token`).
3. Reload `/wizard` and watch the network tab (or run `curl -H "Cookie: sb-access-token=..." http://localhost:3000/api/me`).
4. A `200` response containing `{ id, email, is_subscriber }` confirms the table, policies, and env configuration are in place.
5. If the response is `501`, open your dev console to review the detailed error logged by `/api/me` and fix the missing schema or env variable noted there.

## 3. API Contract
- `GET /api/me` — expects a Supabase session cookie. Returns `{ id, email, is_subscriber }` or `401` if unauthenticated.
- `POST /api/subscribe/confirm` — requires both a valid Supabase session and the service role key. Sets `is_subscriber=true` and `subscribed_at=now()`.

Both routes return `501` when Supabase environment variables are missing so that local development can proceed even before provisioning the backend.

## 4. Next Steps
- Stage 3 will wire Supabase Auth (sign up, login, reset) into the Wizard experience.
- Stripe checkout should redirect to `/wizard?paid=1`; on load the front-end will call `POST /api/subscribe/confirm` before refreshing `GET /api/me`.

No prompt content is persisted or transmitted to Supabase in this workflow, satisfying the HIPAA-safe posture defined in the roadmap.
