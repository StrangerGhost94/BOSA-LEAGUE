import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { SITE_DOMAIN } from "@/lib/site";

const PROTECTED = ["/admin", "/team-panel", "/referee", "/live-desk", "/account"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // The old Railway address and www. move to the league's own domain (API routes stay put, so Pesapal's registered IPN keeps working)
  const publicHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const otherHost = publicHost.endsWith(".up.railway.app") || publicHost === `www.${SITE_DOMAIN}`;
  if (otherHost && !pathname.startsWith("/api/") && ["GET", "HEAD"].includes(req.method)) {
    return NextResponse.redirect(`https://${SITE_DOMAIN}${pathname}${search}`, 308);
  }
  // Pages can tell which address they were opened on (the members-only layout uses it for its search summary)
  const forward = new Headers(req.headers);
  forward.set("x-pathname", pathname);
  const pass = () => NextResponse.next({ request: { headers: forward } });
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return pass();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    // Build the redirect from the public host the browser used. Behind Railway's proxy, req.url is an internal address (localhost:8080).
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? req.nextUrl.protocol.replace(":", "");
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(pathname + search)}`, `${proto}://${host}`));
  }
  return pass();
}

export const config = { matcher: ["/((?!_next/static|_next/image|api/).*)"] };
