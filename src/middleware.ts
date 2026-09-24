import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PROTECTED = ["/admin", "/team-panel", "/referee", "/account"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    // Build the redirect from the public host the browser used. Behind Railway's proxy, req.url is an internal address (localhost:8080).
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? req.nextUrl.protocol.replace(":", "");
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(pathname + search)}`, `${proto}://${host}`));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/team-panel/:path*", "/referee/:path*", "/account/:path*"] };
