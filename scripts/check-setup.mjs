#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());
const envFile = join(root, '.env.local');

function parseEnvFile(filePath) {
  const map = new Map();
  if (!existsSync(filePath)) return map;
  const text = readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map.set(key, value);
  }
  return map;
}

function status(ok) {
  return ok ? 'OK' : 'MISSING';
}

function check() {
  const env = parseEnvFile(envFile);
  const supabaseUrl = env.get('NEXT_PUBLIC_SUPABASE_URL') || '';
  const supabaseAnon = env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
  const supabaseService = env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  const stripeKey = env.get('STRIPE_SECRET_KEY') || '';
  const stripePrice = env.get('STRIPE_PRICE_ID') || '';
  const stripeWebhook = env.get('STRIPE_WEBHOOK_SECRET') || '';

  const plausibleDomain = env.get('NEXT_PUBLIC_PLAUSIBLE_DOMAIN') || '';

  const supabaseReady = Boolean(supabaseUrl && supabaseAnon);
  const serviceRoleReady = Boolean(supabaseUrl && supabaseService);
  const stripeCheckoutReady = Boolean(stripeKey && stripePrice && stripePrice.startsWith('price_'));
  const stripeWebhookReady = Boolean(stripeKey && stripeWebhook);
  const plausibleReady = Boolean(plausibleDomain);

  console.log('\nMediprompt setup check (reading .env.local)');
  console.log('— Supabase client:', status(supabaseReady));
  console.log('— Supabase service role:', status(serviceRoleReady));
  console.log('— Stripe checkout:', status(stripeCheckoutReady));
  console.log('— Stripe webhook:', status(stripeWebhookReady));
  console.log('— Plausible (optional):', plausibleReady ? 'ENABLED' : 'disabled');

  const hints = [];
  if (!supabaseReady) hints.push('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!serviceRoleReady) hints.push('Set SUPABASE_SERVICE_ROLE_KEY (server-only)');
  if (!stripeCheckoutReady) hints.push('Set STRIPE_SECRET_KEY and a valid STRIPE_PRICE_ID (starts with price_)');
  if (!stripeWebhookReady) hints.push('Set STRIPE_WEBHOOK_SECRET (use stripe-webhook script to generate)');

  if (hints.length) {
    console.log('\nNext steps:');
    for (const h of hints) console.log(`- ${h}`);
  } else {
    console.log('\nAll required features are configured.');
  }
  console.log('');
}

check();

