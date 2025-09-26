import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

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

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, is_subscriber")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Unable to load subscription state" },
      { status: 500 },
    );
  }

  // Avoid odd TS inference by explicitly shaping the result.
  const p = profile ?? null;

  const fallbackId = user.id;
  const fallbackEmail = user.email ?? "";

  return NextResponse.json({
    id: p?.id ?? fallbackId,
    email: p?.email ?? fallbackEmail,
    is_subscriber: Boolean(p?.is_subscriber),
  });
}
