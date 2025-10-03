export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://mediprompt.health";

export function buildCanonicalPath(pathname: string) {
  if (!pathname.startsWith("/")) {
    return `${SITE_URL}/${pathname}`;
  }
  return `${SITE_URL}${pathname}`;
}
