# Content Security Policy Snippets

_Status: CSP not yet enforced. Use this when beginning Stage 5 security hardening._

## Recommended Policy Template (App Router)
Add the following helper to `next.config.ts` once you are ready to enforce CSP. Replace the placeholder domains with your production values (Supabase + Plausible + Stripe, if applicable).

```ts
// next.config.ts
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC
  ? new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC).origin
  : "https://plausible.io"; // override if self-hosted

const SUPABASE_PROJECT = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "https://YOUR-PROJECT.supabase.co"; // update before enabling CSP

const csp = [
  "default-src 'self'" ,
  "script-src 'self' 'wasm-unsafe-eval'" + (process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? ` ${PLAUSIBLE_DOMAIN}` : ""),
  "style-src 'self' 'unsafe-inline'", // Tailwind injects inline styles at build time
  "img-src 'self' data:" ,
  "font-src 'self' data:" ,
  "connect-src 'self'" +
    (process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? ` ${PLAUSIBLE_DOMAIN}` : "") +
    ` ${SUPABASE_PROJECT} https://api.supabase.com`,
  "frame-ancestors 'self'", // No iframes expected; tighten if needed
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
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

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

### Notes
- **Plausible:** If `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is empty, the script is not loaded and you can omit `PLAUSIBLE_DOMAIN` in CSP until you enable analytics.
- **Supabase:** Update `SUPABASE_PROJECT` to the project URL (e.g., `https://xyzcompany.supabase.co`). Include any other Supabase subdomains if you use realtime/storage.
- **Stripe:** Hosted Checkout redirect only. If you later embed Stripe Elements or client scripts, add `https://js.stripe.com` to `script-src` and `frame-src`.
- **Further Tightening:** Consider adding `base-uri 'self'` and `form-action 'self' https://checkout.stripe.com` when forms or iframes are introduced.

## Implementation Checklist
- [ ] Update `next.config.ts` with the snippet (after filling domain placeholders).
- [ ] Test locally with `npm run dev` ensuring no CSP violations appear in the console.
- [ ] Run E2E paywall/auth flows and verify Supabase + Plausible endpoints load successfully.
- [ ] Deploy behind a feature flag or staging environment first; watch browser reports.
- [ ] (Optional) Enable CSP violation reporting endpoint for telemetry.

Refer back here before starting Stage 5 hardening so the constraints are top-of-mind.
