# Transport Security Guide

Stage 5 requires HTTPS-only transport and HSTS to protect users end-to-end.

## Enforce HTTPS
- Ensure your deploy target terminates TLS for all hostnames (no HTTP).
- Redirect all `http://` to `https://` at the edge/load balancer.

## Enable HSTS
The app sends `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` via Next.js headers. To ensure it is honored end to end:

- If you use a reverse proxy/CDN (e.g., Vercel, Cloudflare, Nginx), propagate or set the same header at the edge.
- Example (Nginx):

```
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

- Example (Cloudflare): Enable HSTS under SSL/TLS → Edge Certificates with the same directives.

## Notes
- Only enable HSTS after you have HTTPS on all subdomains (due to `includeSubDomains`).
- Consider submitting the domain to the HSTS preload list once you are comfortable with permanent enforcement.

## Verification
- Local sanity check: `npm run verify:transport` confirms the production config includes the HSTS directives.
- Deployed check: `curl -I https://YOUR_DOMAIN` should return `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- If a proxy strips headers, reapply them at the edge to keep the preload-compatible policy intact.
