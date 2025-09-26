# Mediprompt Web

Mediprompt helps patients and caregivers craft safer AI prompts by providing a structured Wizard, Stripe-powered subscriptions, and Plausible analytics. This repository contains the Next.js web application.

## Local development

1. Install dependencies once: `npm install`
2. Seed your env file: `npm run setup:env` (or manually `cp .env.example .env.local`)
3. Fill in the Supabase and Stripe values (Plausible is optional in dev)
4. Quick sanity check: `npm run check:setup`
5. Run the dev server: `npm run dev` and visit `http://localhost:3000`

Node 18+ is recommended to match the production runtime.

## Required environment variables

`.env.example` lists every variable the app expects. Populate the following with real values before deploying:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- Optional overrides: `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC`

Without these, server routes respond with `501 Not Implemented` so that local UI work can continue.

### Helper scripts

- `npm run setup:env` — creates `.env.local` from `.env.example` and appends any missing keys (does not overwrite existing values).
- `npm run check:setup` — inspects `.env.local` and prints which features are configured (Supabase, service role, Stripe checkout/webhook, Plausible).
- `npm run stripe:listen` — uses the Stripe CLI to generate a new `STRIPE_WEBHOOK_SECRET`, writes it into `.env.local`, and forwards events to `http://localhost:3000/api/stripe/webhook`.

Note: The Stripe CLI must be installed for `stripe:listen` to work: https://stripe.com/docs/stripe-cli

## Supabase configuration checklist

1. Create a new project in Supabase (or use an existing one) and enable email/password auth.
2. Apply the Stage 2 schema from `docs/stage-2-backend.md` using the SQL editor. It creates `public.users` with RLS policies so standard clients can only read their own profile while the service role can update subscription status.
3. Confirm RLS by signing in through the app, then calling `/api/me`; the response should include `{ id, email, is_subscriber }` for the logged-in user only.
4. Validate the service role by running the `POST /api/subscribe/confirm` route with a test Stripe session. It should be able to upsert `is_subscriber` without violating RLS.
5. Update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` only on the server (never expose it to the browser).

## Stripe configuration checklist

1. Create a product and recurring price in Stripe, then store the Price ID in `STRIPE_PRICE_ID`.
2. Add your Stripe secret key to `STRIPE_SECRET_KEY`.
3. Register the webhook endpoint `/api/stripe/webhook` with the events `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`; copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Confirm `POST /api/stripe/create-checkout-session` returns a URL when triggered from the Wizard paywall.
5. Complete a test checkout, ensure `/wizard?checkout=success` resolves, and verify `/api/subscribe/confirm` flips `is_subscriber` to `true`.
6. Cancel the test subscription in the Stripe dashboard and verify the webhook downgrades the Supabase profile back to a non-subscriber.

## Plausible analytics setup

1. Add your production domain inside the Plausible dashboard.
2. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (and `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC` if you self-host Plausible).
3. Follow `docs/plausible-setup-checklist.md` to define key goals (auth interactions, preview usage, paywall impressions, subscription confirmations, profile loads).
4. Run `npm run build && npm start` with the analytics variables defined to smoke-test a production bundle and confirm events fire without entering personal text.

## Legal pages

Static routes for Privacy, Terms, and Medical Disclaimer live at `/privacy`, `/terms`, and `/disclaimer`. Update copy there if regulatory requirements change.

## Verification before deployment

- `npm run lint`
- `npm run build`
- Complete the Wizard flow as:
  1. Anonymous preview
  2. Authenticated preview (still free)
  3. Stripe checkout and return
  4. Webhook-triggered downgrade

Reach out at [support@mediprompt.app](mailto:support@mediprompt.app) if you need help with configuration or security reviews.
