import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  isStripeCheckoutConfigured,
  stripeCheckoutCancelUrl,
  stripeCheckoutSuccessUrl,
  stripePriceId,
} from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

function ensureSessionPlaceholder(url: string) {
  if (url.includes("{CHECKOUT_SESSION_ID}")) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
}

function buildReturnUrls(origin: string, rawPath: unknown) {
  if (typeof rawPath !== "string") {
    return null;
  }

  const trimmed = rawPath.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  try {
    const base = new URL(trimmed, origin);

    if (base.origin !== origin) {
      return null;
    }

    const successUrl = new URL(base);
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    const cancelUrl = new URL(base);
    cancelUrl.searchParams.set("checkout", "cancelled");

    return {
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let requestedReturnPath: string | null = null;

  try {
    const payload = await request.json();
    if (payload && typeof payload.returnPath === "string") {
      requestedReturnPath = payload.returnPath;
    }
  } catch {
    // ignore empty body
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase environment variables missing",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth checks.",
      },
      { status: 501 },
    );
  }

  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe checkout not configured",
        hint: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID before creating sessions.",
      },
      { status: 501 },
    );
  }

  if (!stripePriceId.startsWith("price_")) {
    return NextResponse.json(
      {
        error: "Invalid Stripe price id",
        hint: "STRIPE_PRICE_ID must be the price identifier (starts with price_) not the product or payment link.",
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

  const originUrl = new URL(request.url);
  const origin = `${originUrl.protocol}//${originUrl.host}`;
  const returnUrls = buildReturnUrls(origin, requestedReturnPath);

  const defaultSuccessUrl = (() => {
    const success = new URL("/wizard", origin);
    success.searchParams.set("checkout", "success");
    success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    return success.toString();
  })();

  const successUrl = returnUrls?.successUrl
    ? returnUrls.successUrl
    : ensureSessionPlaceholder(stripeCheckoutSuccessUrl || defaultSuccessUrl);

  const cancelUrl = returnUrls?.cancelUrl
    ? returnUrls.cancelUrl
    : stripeCheckoutCancelUrl
      ? stripeCheckoutCancelUrl
      : (() => {
          const cancel = new URL("/wizard", origin);
          cancel.searchParams.set("checkout", "cancelled");
          return cancel.toString();
        })();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        supabase_user_id: user.id,
        price_id: stripePriceId,
      },
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          price_id: stripePriceId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
    });

    if (!session.url) {
      throw new Error("Stripe session missing redirect URL");
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Unable to create Stripe checkout session", error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: "Stripe rejected checkout session",
          hint: error.message,
        },
        { status: error.statusCode ?? 400 },
      );
    }

    return NextResponse.json(
      { error: "Unable to create Stripe checkout session" },
      { status: 500 },
    );
  }
}
