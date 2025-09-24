import { NextResponse } from "next/server";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
};

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 3; // three days fallback

function getCookieOptions(expiresAt: number | null) {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = expiresAt ? Math.max(expiresAt - now, 0) : DEFAULT_MAX_AGE;
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };

  return { ...base, maxAge };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SessionPayload>;

    if (!body.access_token || !body.refresh_token) {
      return NextResponse.json({ error: "Missing session tokens" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    const options = getCookieOptions(body.expires_at ?? null);

    response.cookies.set("sb-access-token", body.access_token, options);
    response.cookies.set("sb-refresh-token", body.refresh_token, options);

    return response;
  } catch (error) {
    console.error("Failed to persist Supabase session", error);
    return NextResponse.json({ error: "Unable to persist session" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });

  return response;
}
