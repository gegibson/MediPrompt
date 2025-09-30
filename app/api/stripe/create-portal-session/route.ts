import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
  type Database,
} from "@/lib/supabase/server";
import {
  stripeBillingPortalReturnUrl,
  stripeSecretKey,
} from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase environment variables missing",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth checks.",
      },
      { status: 501 },
    );
  }

  if (!stripeSecretKey) {
    return NextResponse.json(
      {
        error: "Stripe secret key missing",
        hint: "Set STRIPE_SECRET_KEY to enable billing portal sessions.",
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

  type ProfileRow = Pick<
    Database["public"]["Tables"]["users"]["Row"],
    "is_subscriber" | "subscribed_at" | "email"
  >;

  const { data: profile } = await supabase
    .from("users")
    .select("is_subscriber, subscribed_at, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile?.is_subscriber) {
    return NextResponse.json(
      {
        error: "No active subscription",
        hint: "Only subscribers can manage billing through the portal",
      },
      { status: 400 },
    );
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

  const originUrl = new URL(request.url);
  const origin = `${originUrl.protocol}//${originUrl.host}`;
  const returnUrl = stripeBillingPortalReturnUrl || new URL("/profile", origin).toString();

  let customerId: string | null = null;

  try {
    const searchQuery = `metadata['supabase_user_id']:'${user.id}'`;
    const subscriptions = await stripe.subscriptions.search({
      limit: 1,
      query: searchQuery,
      expand: ["data.customer"],
    });

    const subscription = subscriptions.data.at(0);

    if (subscription) {
      if (typeof subscription.customer === "string") {
        customerId = subscription.customer;
      } else if (subscription.customer?.id) {
        customerId = subscription.customer.id;
      }
    }
  } catch (error) {
    console.warn("Unable to locate subscription via metadata", error);
  }

  if (!customerId) {
    const lookupEmail = profile.email ?? user.email ?? undefined;

    if (lookupEmail) {
      try {
        const customers = await stripe.customers.list({ email: lookupEmail, limit: 5 });
        const candidate = customers.data.find((customer) => {
          if (customer.metadata?.supabase_user_id) {
            return customer.metadata.supabase_user_id === user.id;
          }
          return true;
        });

        if (candidate) {
          customerId = candidate.id;
        }
      } catch (error) {
        console.warn("Unable to locate Stripe customer by email", error);
      }
    }
  }

  if (!customerId) {
    return NextResponse.json(
      {
        error: "Unable to locate billing profile",
        hint: "Try again in a minute or contact support@mediprompt.app for help.",
      },
      { status: 404 },
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      throw new Error("Billing portal session missing URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create billing portal session", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe rejected billing portal session",
          hint: error.message,
        },
        { status: error.statusCode ?? 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to open billing portal",
        hint: "Something unexpected happened while contacting Stripe. Please try again.",
      },
      { status: 500 },
    );
  }
}
