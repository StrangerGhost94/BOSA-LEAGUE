import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Relative redirect: behind Railway's proxy the server's own URL is an internal address (localhost:8080),
// so we must not build an absolute URL from req.url.
export async function POST() {
  const res = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
