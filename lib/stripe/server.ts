import Stripe from "stripe";

import { stripeSecretKey } from "./config";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeSecretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey);
  }

  return stripeClient;
}
