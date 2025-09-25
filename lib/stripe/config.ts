function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export const stripeSecretKey = env("STRIPE_SECRET_KEY");
export const stripePriceId = env("STRIPE_PRICE_ID");
export const stripeWebhookSecret = env("STRIPE_WEBHOOK_SECRET");
export const stripeCheckoutSuccessUrl = env("STRIPE_CHECKOUT_SUCCESS_URL");
export const stripeCheckoutCancelUrl = env("STRIPE_CHECKOUT_CANCEL_URL");

export function isStripeCheckoutConfigured() {
  return Boolean(stripeSecretKey && stripePriceId);
}

export function isStripeWebhookConfigured() {
  return Boolean(stripeSecretKey && stripeWebhookSecret);
}
