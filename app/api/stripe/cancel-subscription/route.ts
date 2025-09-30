import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function findActiveSubscription(stripe: Stripe, user: {
  id: string;
  email?: string | null;
}) {
  try {
    const search = await stripe.subscriptions.search({
      limit: 1,
      query: `metadata['supabase_user_id']:'${user.id}' AND status:'active'`,
    });

    if (search.data.length > 0) {
      return search.data[0];
    }
  } catch (error) {
    console.warn("Active subscription search failed", error);
  }

  if (user.email) {
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 5,
      });

      for (const customer of customers.data) {
        try {
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
          });

          if (subs.data.length > 0) {
            return subs.data[0];
          }
        } catch (error) {
          console.warn("Customer subscription list failed", error);
        }
      }
    } catch (error) {
      console.warn("Customer lookup failed", error);
    }
  }

  return null;
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase environment variables missing",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth checks.",
      },
      { status: 501 },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase client unavailable" }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return NextResponse.json(
      {
        error: "Stripe client unavailable",
        hint: "Verify STRIPE_SECRET_KEY is configured.",
      },
      { status: 500 },
    );
  }

  const subscription = await findActiveSubscription(stripe, user);

  if (!subscription) {
    return NextResponse.json(
      {
        error: "No active subscription",
        hint: "We could not locate an active Stripe subscription for this account.",
      },
      { status: 404 },
    );
  }

  if (subscription.cancel_at_period_end) {
    const toIso = (value?: number | null) =>
      value ? new Date(value * 1000).toISOString() : null;

    return NextResponse.json({
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: toIso(subscription.current_period_end),
      cancelAt: toIso(subscription.cancel_at),
      status: subscription.status,
      notice: "Subscription already scheduled to cancel at period end.",
    });
  }

  try {
    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    const toIso = (value?: number | null) =>
      value ? new Date(value * 1000).toISOString() : null;

    return NextResponse.json({
      subscriptionId: updated.id,
      cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end),
      currentPeriodEnd: toIso(updated.current_period_end),
      cancelAt: toIso(updated.cancel_at),
      status: updated.status,
    });
  } catch (error) {
    console.error("Unable to schedule Stripe cancellation", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe rejected cancellation",
          hint: error.message,
        },
        { status: error.statusCode ?? 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to schedule cancellation",
        hint: "We could not contact Stripe. Please try again or reach out to support.",
      },
      { status: 500 },
    );
  }
}
