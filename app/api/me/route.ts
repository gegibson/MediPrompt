import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const SETUP_ERROR_CODES = new Set([
  "42P01", // relation does not exist
  "PGRST301", // RLS policy missing
  "PGRST302", // RLS policy blocks access
]);

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase environment variables missing",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth checks.",
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

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, is_subscriber")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Supabase profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });

    if (profileError.code && SETUP_ERROR_CODES.has(profileError.code)) {
      return NextResponse.json(
        {
          error: "Supabase profile table not ready",
          hint: "Create the users table and RLS policies from docs/stage-2-backend.md before loading profiles.",
        },
        { status: 501 },
      );
    }

    return NextResponse.json(
      { error: "Unable to load subscription state" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: profile?.id ?? user.id,
    email: profile?.email ?? user.email,
    is_subscriber: Boolean(profile?.is_subscriber),
  });
}
