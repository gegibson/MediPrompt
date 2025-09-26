import { NextResponse } from "next/server";

const ACCESS_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";

type PersistSessionBody = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | null;
};

function resolveCookieOptions(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secure = (forwardedProto ?? url.protocol.replace(":", "")) === "https";

  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure,
  };
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: PersistSessionBody;

  try {
    payload = (await request.json()) as PersistSessionBody;
  } catch {
    return NextResponse.json({ error: "Invalid session payload" }, { status: 400 });
  }

  if (!payload?.access_token || !payload?.refresh_token) {
    return NextResponse.json(
      { error: "Missing access or refresh token" },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ success: true });
  const options = resolveCookieOptions(request);
  const expires = payload.expires_at
    ? new Date(payload.expires_at * 1000)
    : undefined;

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: payload.access_token,
    ...options,
    expires,
  });
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: payload.refresh_token,
    ...options,
    // keep refresh token slightly longer; Supabase rotates automatically
    expires,
  });

  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ success: true });
  const options = resolveCookieOptions(request);

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: "",
    ...options,
    expires: new Date(0),
  });
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    ...options,
    expires: new Date(0),
  });

  return response;
}

