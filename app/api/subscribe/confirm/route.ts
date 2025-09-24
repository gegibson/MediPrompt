import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
  hasServiceRoleConfiguration,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  if (!hasServiceRoleConfiguration()) {
    return NextResponse.json(
      {
        error: "Service role configuration missing",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY to allow subscription updates.",
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

  const adminClient = createSupabaseServiceRoleClient();

  if (!adminClient) {
    return NextResponse.json({ error: "Admin client unavailable" }, { status: 500 });
  }

  const timestamp = new Date().toISOString();

  const updateResult = await adminClient
    .from("users")
    .update({
      is_subscriber: true,
      subscribed_at: timestamp,
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
      subscribed_at: timestamp,
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
