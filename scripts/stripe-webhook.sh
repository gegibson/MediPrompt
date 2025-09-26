#!/usr/bin/env bash
set -euo pipefail

# Convenience wrapper around the Stripe CLI to:
# 1) Ensure .env.local exists
# 2) Print and write STRIPE_WEBHOOK_SECRET into .env.local
# 3) Start forwarding webhooks to the local Next.js endpoint

EVENTS="checkout.session.completed,customer.subscription.updated,customer.subscription.deleted"
# Match the app's default local port
FORWARD_URL="http://localhost:3001/api/stripe/webhook"

if ! command -v stripe >/dev/null 2>&1; then
  echo "[stripe-webhook] The Stripe CLI is not installed or not in PATH." >&2
  echo "Install: https://stripe.com/docs/stripe-cli and retry." >&2
  exit 1
fi

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [[ ! -f .env.local ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env.local
    echo "[stripe-webhook] Created .env.local from .env.example"
  else
    echo "[stripe-webhook] Missing .env.local and .env.example; create one before proceeding." >&2
    exit 1
  fi
fi

echo "[stripe-webhook] Requesting a new webhook signing secret for events: ${EVENTS}"
SECRET=$(stripe listen --print-secret --events "$EVENTS")

if [[ -z "$SECRET" ]]; then
  echo "[stripe-webhook] Failed to obtain STRIPE_WEBHOOK_SECRET" >&2
  exit 1
fi

# Update or append STRIPE_WEBHOOK_SECRET in .env.local
if grep -qE '^STRIPE_WEBHOOK_SECRET=' .env.local; then
  # macOS/BSD sed inline edit compatibility
  sed -i.bak "s/^STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=${SECRET}/" .env.local && rm -f .env.local.bak
else
  echo "STRIPE_WEBHOOK_SECRET=${SECRET}" >> .env.local
fi

echo "[stripe-webhook] Wrote STRIPE_WEBHOOK_SECRET to .env.local"
echo "[stripe-webhook] Starting listener → forwarding to ${FORWARD_URL}"
echo "[stripe-webhook] Press Ctrl+C to stop. Restart your dev server to pick up the new secret if needed."

exec stripe listen --events "$EVENTS" --forward-to "$FORWARD_URL"
