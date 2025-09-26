import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  createSupabaseServiceRoleClient,
  hasServiceRoleConfiguration,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/server";
import {
  isStripeWebhookConfigured,
  stripePriceId,
  stripeWebhookSecret,
} from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

export async function POST(request: Request) {
  if (!hasServiceRoleConfiguration()) {
    return NextResponse.json(
      {
        error: "Service role configuration missing",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY to allow subscription updates.",
      },
      { status: 501 },
    );
  }

  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe webhook not configured",
        hint: "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to process Stripe events.",
      },
      { status: 501 },
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

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const adminClient = createSupabaseServiceRoleClient();

  if (!adminClient) {
    return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(adminClient, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(adminClient, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(adminClient, event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(adminClient: AdminClient, session: Stripe.Checkout.Session) {
  const supabaseUserId = session.metadata?.supabase_user_id ?? session.client_reference_id;

  if (!supabaseUserId) {
    console.warn("Checkout session missing supabase user id", session.id);
    return;
  }

  if (session.metadata?.price_id && session.metadata.price_id !== stripePriceId) {
    console.warn("Checkout session price mismatch", session.id);
    return;
  }

  const subscribedAt = session.created
    ? new Date(session.created * 1000).toISOString()
    : new Date().toISOString();

  const email = session.customer_details?.email ?? session.customer_email ?? null;

  await upsertSubscription(adminClient, supabaseUserId, {
    email,
    subscribedAt,
  });
}

async function handleSubscriptionUpdated(
  adminClient: AdminClient,
  subscription: Stripe.Subscription,
) {
  const supabaseUserId = subscription.metadata?.supabase_user_id;

  if (!supabaseUserId) {
    console.warn("Subscription update missing supabase user id", subscription.id);
    return;
  }

  if (subscription.metadata?.price_id && subscription.metadata.price_id !== stripePriceId) {
    console.warn("Subscription update price mismatch", subscription.id);
    return;
  }

  const activeStatuses: Array<Stripe.Subscription.Status> = ["active", "trialing"];
  const isActive = activeStatuses.includes(subscription.status);

  if (isActive) {
    await upsertSubscription(adminClient, supabaseUserId, {
      email: null,
      subscribedAt: new Date(subscription.current_period_start * 1000).toISOString(),
    });
    return;
  }

  const cancelStatuses: Array<Stripe.Subscription.Status> = [
    "canceled",
    "incomplete",
    "incomplete_expired",
    "past_due",
    "unpaid",
  ];

  if (cancelStatuses.includes(subscription.status)) {
    await clearSubscription(adminClient, supabaseUserId);
  }
}

async function handleSubscriptionDeleted(adminClient: AdminClient, subscription: Stripe.Subscription) {
  const supabaseUserId = subscription.metadata?.supabase_user_id;

  if (!supabaseUserId) {
    console.warn("Subscription deletion missing supabase user id", subscription.id);
    return;
  }

  await clearSubscription(adminClient, supabaseUserId);
}

async function upsertSubscription(
  adminClient: AdminClient,
  userId: string,
  {
    email,
    subscribedAt,
  }: {
    email: string | null;
    subscribedAt: string;
  },
) {
  const resolvedEmail = await resolveUserEmail(adminClient, userId, email);

  const updatePayload: Database["public"]["Tables"]["users"]["Update"] = {
    is_subscriber: true,
    subscribed_at: subscribedAt,
    ...(resolvedEmail ? { email: resolvedEmail } : {}),
  };

  const updateResult = await adminClient
    .from("users")
    .update(updatePayload)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (updateResult.error && updateResult.error.code !== "PGRST116") {
    throw updateResult.error;
  }

  if (!updateResult.data) {
    if (!resolvedEmail) {
      throw new Error(`Unable to resolve email for user ${userId}`);
    }

    const insertPayload: Database["public"]["Tables"]["users"]["Insert"] = {
      id: userId,
      email: resolvedEmail,
      is_subscriber: true,
      subscribed_at: subscribedAt,
    };

    const insertResult = await adminClient.from("users").insert(insertPayload);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }
}

async function clearSubscription(adminClient: AdminClient, userId: string) {
  const clearPayload: Database["public"]["Tables"]["users"]["Update"] = {
    is_subscriber: false,
    subscribed_at: null,
  };

  const updateResult = await adminClient
    .from("users")
    .update(clearPayload)
    .eq("id", userId);

  if (updateResult.error) {
    throw updateResult.error;
  }
}

async function resolveUserEmail(
  adminClient: AdminClient,
  userId: string,
  fallback: string | null,
) {
  if (fallback) {
    return fallback;
  }

  const existing = await adminClient
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (existing.data?.email) {
    return existing.data.email;
  }

  const authLookup = await adminClient.auth.admin.getUserById(userId);

  return authLookup.data.user?.email ?? null;
}
