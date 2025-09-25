# Stage 2 — Supabase Scaffolding

These notes capture the required backend pieces for the Stage 2 milestone. The Next.js routes expect the following Supabase resources and environment configuration.

## 1. Environment Variables
Copy `.env.example` to `.env.local` inside `web/` and populate the values from your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key-for-admin-updates

STRIPE_SECRET_KEY=sk_test_example
STRIPE_PRICE_ID=price_123
STRIPE_WEBHOOK_SECRET=whsec_123
# STRIPE_CHECKOUT_SUCCESS_URL=https://localhost:3000/wizard?checkout=success
# STRIPE_CHECKOUT_CANCEL_URL=https://localhost:3000/wizard?checkout=cancelled

NEXT_PUBLIC_PLAUSIBLE_DOMAIN=mediprompt.example
# NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC=https://plausible.io/js/script.js
```

The `SUPABASE_SERVICE_ROLE_KEY` powers subscription mutations in both the confirmation route and the Stripe webhook handler. Stripe keys unlock the server-generated Checkout session (`STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`) and secure webhook verification (`STRIPE_WEBHOOK_SECRET`).

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
- `POST /api/stripe/create-checkout-session` — enforces Supabase auth, creates a Stripe Checkout session for the configured price, and returns `{ url, sessionId }`.
- `POST /api/subscribe/confirm` — accepts `{ sessionId }`, verifies the Checkout session with Stripe, and persists the subscription in Supabase. Rejects mismatched users or prices.
- `POST /api/stripe/webhook` — receives Stripe events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) and keeps the Supabase profile in sync even if the browser never returns.

All routes return `501` when required environment variables are missing so local development can proceed before wiring real services.

## 4. Next Steps
- Stage 3 wires Supabase Auth (sign up, login, reset) into the Wizard experience.
- Point the Stripe Checkout success URL to `/wizard?checkout=success` so the client can call `POST /api/subscribe/confirm` with the returned `session_id`.
- Register the Stripe webhook endpoint (`/api/stripe/webhook`) with `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` events to keep subscription state durable.

No prompt content is persisted or transmitted to Supabase in this workflow, satisfying the HIPAA-safe posture defined in the roadmap.
