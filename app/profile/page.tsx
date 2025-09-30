import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type Stripe from "stripe";

import UserProfilePage from "./UserProfilePage";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
  type Database,
} from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";

export const metadata: Metadata = {
  title: "My Profile — Mediprompt",
  description: "View and manage your Mediprompt profile.",
};

export default async function ProfileRoute() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  type ProfileRow = Pick<
    Database["public"]["Tables"]["users"]["Row"],
    "id" | "email" | "is_subscriber" | "subscribed_at"
  >;

  const { data: profileRecord } = await supabase
    .from("users")
    .select("id, email, is_subscriber, subscribed_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  type SubscriptionSnapshot = {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    cancelAt: string | null;
  };

  let subscriptionSnapshot: SubscriptionSnapshot | null = null;

  if (profileRecord?.is_subscriber) {
    const stripe = getStripeClient();

    if (stripe) {
      async function findSubscription() {
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

        if (!lookups.some(Boolean) && user.email) {
          try {
            const customers = await stripe.customers.list({
              email: user.email,
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

        if (subscription) {
          const toIso = (value: number | null | undefined) =>
            value ? new Date(value * 1000).toISOString() : null;

          subscriptionSnapshot = {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            currentPeriodEnd: toIso(subscription.current_period_end),
            cancelAt: toIso(subscription.cancel_at),
          };
        }
      } catch (error) {
        console.error("Unable to load Stripe subscription snapshot", error);
      }
    }
  }

  return (
    <UserProfilePage
      user={user}
      profile={profileRecord ?? null}
      subscription={subscriptionSnapshot}
    />
  );
}
