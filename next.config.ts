import type { NextConfig } from "next";
import path from "path";

const PLAUSIBLE_SCRIPT_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC?.trim();
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

const PLAUSIBLE_ORIGIN = PLAUSIBLE_SCRIPT_SRC
  ? (() => {
      try {
        return new URL(PLAUSIBLE_SCRIPT_SRC).origin;
      } catch {
        return "https://plausible.io";
      }
    })()
  : "https://plausible.io";

const SUPABASE_ORIGIN = SUPABASE_URL
  ? (() => {
      try {
        return new URL(SUPABASE_URL).origin;
      } catch {
        return "https://YOUR-PROJECT.supabase.co";
      }
    })()
  : "https://YOUR-PROJECT.supabase.co"; // update before enabling CSP in production

const csp = [
  "default-src 'self'",
  // Allow Next.js inline runtime with 'unsafe-inline'; add Plausible origin if enabled
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${PLAUSIBLE_DOMAIN ? ` ${PLAUSIBLE_ORIGIN}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // Allow HTTPS endpoints (Supabase APIs) and WSS (Realtime) in addition to allowlisted origins
  `connect-src 'self' https: wss:${PLAUSIBLE_DOMAIN ? ` ${PLAUSIBLE_ORIGIN}` : ""} ${SUPABASE_ORIGIN} https://api.supabase.com`,
  "frame-ancestors 'self'",
  // If you later embed Stripe Elements, add: js.stripe.com to script-src and frame-src
  // You can also add: frame-src https://checkout.stripe.com for hosted checkout if embedding
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const IS_PROD = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Silence root inference warnings and ensure correct workspace
  turbopack: {
    root: __dirname,
  },
  // Avoid traversing outside this project for file tracing
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    if (!IS_PROD) {
      // Avoid strict CSP in development to prevent dev overlay/script blocking.
      return [];
    }
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
