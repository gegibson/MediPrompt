import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
  hasServiceRoleConfiguration,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  isStripeCheckoutConfigured,
  stripePriceId,
} from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type ConfirmRequestBody = {
  sessionId?: string;
};

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

  if (!hasServiceRoleConfiguration()) {
    return NextResponse.json(
      {
        error: "Service role configuration missing",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY to allow subscription updates.",
      },
      { status: 501 },
    );
  }

  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe checkout not configured",
        hint: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable subscription confirmation.",
      },
      { status: 501 },
    );
  }

  const supabase = createSupabaseServerClient();

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

  let payload: ConfirmRequestBody;

  try {
    payload = (await request.json()) as ConfirmRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const sessionId = payload?.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session id" },
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

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "line_items"],
    });
  } catch (error) {
    console.error("Unable to retrieve checkout session", error);
    return NextResponse.json(
      { error: "Unable to verify session" },
      { status: 400 },
    );
  }

  if (session.mode !== "subscription" || session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Checkout session is not paid" },
      { status: 400 },
    );
  }

  if (session.client_reference_id && session.client_reference_id !== user.id) {
    return NextResponse.json(
      { error: "Session does not match user" },
      { status: 403 },
    );
  }

  const metadataUserId = session.metadata?.supabase_user_id;

  if (metadataUserId && metadataUserId !== user.id) {
    return NextResponse.json(
      { error: "Session metadata does not match user" },
      { status: 403 },
    );
  }

  const metadataPriceId = session.metadata?.price_id;

  if (metadataPriceId && metadataPriceId !== stripePriceId) {
    return NextResponse.json(
      { error: "Checkout session price mismatch" },
      { status: 400 },
    );
  }

  const includesExpectedPrice =
    session.line_items?.data?.some((item) => item.price?.id === stripePriceId) ?? false;

  if (!includesExpectedPrice) {
    return NextResponse.json(
      { error: "Checkout session price mismatch" },
      { status: 400 },
    );
  }

  const adminClient = createSupabaseServiceRoleClient();

  if (!adminClient) {
    return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
  }

  const subscription =
    typeof session.subscription === "string"
      ? null
      : session.subscription;

  const subscribedAt = subscription?.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : session.created
      ? new Date(session.created * 1000).toISOString()
      : new Date().toISOString();

  const updateResult = await adminClient
    .from("users")
    .update({
      is_subscriber: true,
      subscribed_at: subscribedAt,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (updateResult.error && updateResult.error.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Unable to update subscription" },
      { status: 500 },
    );
  }

  if (!updateResult.data) {
    const insertResult = await adminClient.from("users").insert({
      id: user.id,
      email: user.email,
      is_subscriber: true,
      subscribed_at: subscribedAt,
    });

    if (insertResult.error) {
      return NextResponse.json(
        { error: "Unable to create subscription record" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
