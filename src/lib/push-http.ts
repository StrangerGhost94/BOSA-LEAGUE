import "server-only";
import { headers } from "next/headers";

export const PUSH_COOKIE = "bosa_push";

/** Refuses cross-site requests: the Origin (when sent) must be this site. */
export function sameOrigin() {
  const h = headers();
  const origin = h.get("origin");
  if (!origin) return true; // same-origin fetches from older Safari may omit it; the session cookie is SameSite=Lax anyway
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
