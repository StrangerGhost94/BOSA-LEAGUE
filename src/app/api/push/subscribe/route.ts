import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { pool } from "@/db";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { describeDevice, pushConfigured, validSubscription } from "@/lib/push";
import { PUSH_COOKIE, sameOrigin } from "@/lib/push-http";
import { overLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_DEVICES = 10;

/**
 * Saves this device's push subscription for the signed-in member.
 * The person comes only from the session cookie; any user id in the body is ignored.
 */
export async function POST(req: Request) {
  if (!sameOrigin()) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!pushConfigured()) return NextResponse.json({ error: "Notifications are not switched on for this site yet." }, { status: 503 });
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!hasMembership(u)) return NextResponse.json({ error: "Match notifications are for members." }, { status: 403 });
  if (overLimit(`push-sub:${u.id}`, 20, 10 * 60_000)) return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const sub = validSubscription(body?.subscription);
  if (!sub) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  const ua = (headers().get("user-agent") ?? "").slice(0, 400);
  const { platform, browser } = describeDevice(ua);
  // One row per endpoint. If the phone changes hands (someone else signs in on it), it moves to the new person.
  const { rows } = await pool.query(
    `insert into push_subscriptions (id, user_id, endpoint, p256dh, auth, platform, browser, user_agent, last_used_at)
     values (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, now())
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
       platform = excluded.platform, browser = excluded.browser, user_agent = excluded.user_agent,
       updated_at = now(), last_used_at = now(), revoked_at = null
     returning id`,
    [u.id, sub.endpoint, sub.p256dh, sub.auth, platform, browser, ua],
  );
  const id = rows[0].id as string;
  // Keep the newest few devices per person
  await pool.query(
    `update push_subscriptions set revoked_at = now() where user_id = $1 and revoked_at is null and id not in
       (select id from push_subscriptions where user_id = $1 and revoked_at is null order by coalesce(last_used_at, created_at) desc limit ${MAX_DEVICES})`,
    [u.id],
  );
  const res = NextResponse.json({ ok: true });
  // Lets sign-out switch off notifications on this device
  res.cookies.set(PUSH_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
