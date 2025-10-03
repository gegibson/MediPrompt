import { NextResponse } from "next/server";

import type Stripe from "stripe";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
  type Database,
} from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";

type SubscriptionSnapshot = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
};

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ subscription: null }, { status: 200 });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ subscription: null }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ subscription: null }, { status: 401 });
  }

  type ProfileRow = Pick<
    Database["public"]["Tables"]["users"]["Row"],
    "id" | "is_subscriber" | "email"
  >;

  const { data: profileRecord } = await supabase
    .from("users")
    .select("id, is_subscriber, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profileRecord?.is_subscriber) {
    return NextResponse.json({ subscription: null }, { status: 200 });
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return NextResponse.json({ subscription: null }, { status: 200 });
  }

  async function findSubscription(): Promise<Stripe.Subscription | null> {
    const lookups: Array<Stripe.Subscription | null> = [];

    try {
      const search = await stripe.subscriptions.search({
        limit: 1,
        query: `metadata['supabase_user_id']:'${user.id}'`,
      });

      lookups.push(search.data.at(0) ?? null);
    } catch (error) {
      console.warn("Subscription search failed", error);
    }

    if (!lookups.some(Boolean) && profileRecord.email) {
      try {
        const customers = await stripe.customers.list({
          email: profileRecord.email,
          limit: 5,
        });

        for (const customer of customers.data) {
          try {
            const subs = await stripe.subscriptions.list({
              customer: customer.id,
              limit: 1,
            });
            if (subs.data.length > 0) {
              lookups.push(subs.data[0]);
              break;
            }
          } catch (error) {
            console.warn("Customer subscription lookup failed", error);
          }
        }
      } catch (error) {
        console.warn("Customer search failed", error);
      }
    }

    return lookups.find((candidate) => Boolean(candidate)) ?? null;
  }

  try {
    const subscription = await findSubscription();

    if (!subscription) {
      return NextResponse.json({ subscription: null }, { status: 200 });
    }

    const toIso = (value: number | null | undefined) =>
      value ? new Date(value * 1000).toISOString() : null;

    const snapshot: SubscriptionSnapshot = {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      currentPeriodEnd: toIso(subscription.current_period_end),
      cancelAt: toIso(subscription.cancel_at),
    };

    return NextResponse.json({ subscription: snapshot }, { status: 200 });
  } catch (error) {
    console.error("Unable to load Stripe subscription snapshot", error);
    return NextResponse.json({ subscription: null }, { status: 200 });
  }
}
