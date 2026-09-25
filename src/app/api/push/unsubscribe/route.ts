import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/db";
import { PUSH_COOKIE, sameOrigin } from "@/lib/push-http";
import { overLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Switches notifications off for this device. Works signed out too (e.g. after signing out), because
 * only the device itself knows its endpoint, an unguessable URL. It can only switch things off.
 */
export async function POST(req: Request) {
  if (!sameOrigin()) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (overLimit(`push-unsub:${ip}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.slice(0, 1000) : "";
  const cookieId = cookies().get(PUSH_COOKIE)?.value;
  if (endpoint) await pool.query("update push_subscriptions set revoked_at = now(), updated_at = now() where endpoint = $1 and revoked_at is null", [endpoint]);
  else if (cookieId) await pool.query("update push_subscriptions set revoked_at = now(), updated_at = now() where id = $1 and revoked_at is null", [cookieId]);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PUSH_COOKIE);
  return res;
}
