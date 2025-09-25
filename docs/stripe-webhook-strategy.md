# Stripe Checkout & Webhook Strategy

This note captures how the app now provisions Stripe Checkout sessions, confirms them on return, and keeps subscription state synchronized via webhooks.

## 1. Checkout Session Creation
- `POST /api/stripe/create-checkout-session` runs server-side with the authenticated Supabase user.
- Each session sets `client_reference_id` and `metadata.supabase_user_id` with the Supabase auth UUID so webhooks can map the event back to the user.
- `metadata.price_id` is also stored to ensure webhook payloads only unlock the configured subscription (`STRIPE_PRICE_ID`).
- Success/cancel URLs default to `/wizard?checkout=success|cancelled` but can be overridden with `STRIPE_CHECKOUT_SUCCESS_URL` / `STRIPE_CHECKOUT_CANCEL_URL`. The helper automatically appends `{CHECKOUT_SESSION_ID}` if you forget to include it.

## 2. Front-end Confirmation
- Stripe redirects back with `?checkout=success&session_id=...`.
- The wizard calls `POST /api/subscribe/confirm` with that `session_id`.
- The server retrieves the Checkout Session, verifies price and user metadata, and upserts `is_subscriber=true` in Supabase.
- Any `501` response surfaces the configuration hint so env gaps are obvious during testing.

## 3. Webhook Processing
- Endpoint: `POST /api/stripe/webhook` (server runtime enforced).
- Required events:
  - `checkout.session.completed` — marks `is_subscriber=true` using metadata + customer email.
  - `customer.subscription.updated` — toggles `is_subscriber` based on status (`active`/`trialing` stay true, cancelled/past_due/etc. clear access).
  - `customer.subscription.deleted` — immediately revokes access.
- The handler uses the Supabase service role client to update the `users` table and resolves email via existing records or `auth.admin.getUserById` when the webhook payload omits it.
- All handlers bail out silently (200) if metadata is missing or price IDs do not match, preventing other Stripe products from accidentally toggling access.

## 4. Environment Checklist
```
STRIPE_SECRET_KEY=sk_test_example
STRIPE_PRICE_ID=price_123
STRIPE_WEBHOOK_SECRET=whsec_123
STRIPE_CHECKOUT_SUCCESS_URL=https://localhost:3000/wizard?checkout=success
STRIPE_CHECKOUT_CANCEL_URL=https://localhost:3000/wizard?checkout=cancelled
```
- Generate the Checkout success/cancel URLs inside the Stripe Dashboard (or CLI) and be sure the success link contains `session_id={CHECKOUT_SESSION_ID}`.
- When running locally, the defaults point to `http://localhost:3000`, so you can omit the overrides unless you host behind a tunnel.

## 5. Local Testing Flow
1. `npm install` (to pull `stripe`) and `npm run dev`.
2. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the displayed `whsec_...` into `.env.local`.
3. Sign in, hit the paywall, click **Go to checkout**, and complete a test payment.
4. After redirect, the wizard should call `POST /api/subscribe/confirm`, show "Unlocking subscription...", and clear the query params once confirmed.
5. After the confirm API resolves, reload `/wizard` and ensure the paywall stays unlocked. In Supabase ▸ Table editor ▸ `public.users`, you should now see `is_subscriber=true` for your test user.
6. Cancel the subscription from the Stripe dashboard; the webhook should flip `is_subscriber` back to `false` (refresh the Supabase table or rerun `/api/me` to verify).

## 6. Production Rollout
- Add the webhook endpoint in the Stripe Dashboard (Developers → Webhooks) pointing to `https://yourdomain.com/api/stripe/webhook` with the three events above.
- Promote the live `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and webhook secret into the deployment environment.
- Monitor webhook delivery logs in Stripe; failures return 500 with reasons logged in the Next.js server output.
- Consider enabling Stripe's retry + email alerts to catch missed events.

Following this playbook keeps subscription state resilient even if the user closes the tab before redirecting back to the wizard.
