import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { PUSH_COOKIE } from "@/lib/push-http";
import { pool } from "@/db";

// Relative redirect: behind Railway's proxy the server's own URL is an internal address (localhost:8080),
// so we must not build an absolute URL from req.url.
export async function POST() {
  // Stop notifications for the signed-out account on this device
  const pushId = cookies().get(PUSH_COOKIE)?.value;
  if (pushId) await pool.query("update push_subscriptions set revoked_at = now(), updated_at = now() where id = $1", [pushId]).catch(() => {});
  const res = new NextResponse(null, { status: 303, headers: { Location: "/" } });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(PUSH_COOKIE);
  return res;
}
