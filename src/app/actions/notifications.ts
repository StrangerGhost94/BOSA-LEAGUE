"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/db";
import { requireUser, hasMembership } from "@/lib/auth";
import { guarded } from "@/lib/guard";
import { fail, ok, str, bool } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import { overLimit } from "@/lib/rate-limit";
import { audienceFor, inBackground, pushConfigured, sendPushNotification, sendPushToUsers, type Audience, type PushType } from "@/lib/push";
import type { ActionResult } from "@/components/form";

type A = Promise<ActionResult>;

const PREFS = ["match_reminders", "match_results", "goals", "league_announcements", "team_updates", "general_notifications"] as const;

/** The signed-in person's own notification choices. The person comes from the session only. */
export async function saveNotificationPrefsAction(_: ActionResult, fd: FormData): A {
  const u = await requireUser("/account");
  const v = PREFS.map((k) => bool(fd, k));
  await pool.query(
    `insert into notification_preferences (user_id, ${PREFS.join(", ")}, updated_at) values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (user_id) do update set ${PREFS.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = now()`,
    [u.id, ...v],
  );
  revalidatePath("/account");
  return ok("Notification settings saved.");
}

/** Sends a test notification to the signed-in person's own devices. */
export async function sendTestPushAction(_: ActionResult): A {
  const u = await requireUser("/account");
  if (!hasMembership(u)) return fail("Match notifications are for members.");
  if (!pushConfigured()) return fail("Notifications are not switched on for this site yet.");
  if (overLimit(`push-test:${u.id}`, 3, 10 * 60_000)) return fail("You have sent a few tests already. Try again in 10 minutes.");
  const r = await sendPushNotification(u.id, { type: "GENERAL", title: "BOSA League", body: "Notifications are working on this device.", url: "/account", tag: "test" }, { ignorePreferences: true, ttl: 600 });
  if (r.sent) return ok(`Test sent to ${r.sent} device${r.sent === 1 ? "" : "s"}. It should arrive in a few seconds.`);
  return fail(r.failed ? "The test could not be delivered. Turn notifications off and on again on this device." : "No device is set up yet. Tap Enable first.");
}

const ADMIN_TYPES: PushType[] = ["LEAGUE_ANNOUNCEMENT", "TEAM_UPDATE", "FIXTURE", "GENERAL"];

/**
 * Control Room announcement. Permission is checked on the server from the session (news editors:
 * Super Admin, League Administrator, Competition Manager); nothing the browser says about roles is trusted.
 */
export async function sendAnnouncementAction(_: ActionResult, fd: FormData): A {
  return guarded("news", async (u) => {
    if (!pushConfigured()) return fail("Push is not configured: set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT on the server.");
    const type = str(fd, "type") as PushType;
    if (!ADMIN_TYPES.includes(type)) return fail("Choose a notification type.");
    const title = str(fd, "title");
    const body = str(fd, "body");
    let url = str(fd, "url") || "/";
    if (title.length < 3 || title.length > 60) return fail("The title should be 3 to 60 characters.");
    if (body.length < 3 || body.length > 180) return fail("The message should be 3 to 180 characters.");
    if (!url.startsWith("/") || url.startsWith("//")) return fail("The link must be a page on this site, starting with /.");
    url = url.slice(0, 200);

    const to = str(fd, "audience");
    let audience: Audience;
    if (to === "team") {
      const teamId = str(fd, "teamId");
      if (!teamId) return fail("Choose the club.");
      audience = { kind: "teams", teamIds: [teamId] };
    } else if (to === "users") {
      const ids = fd.getAll("userIds").filter((x): x is string => typeof x === "string").slice(0, 500);
      if (!ids.length) return fail("Tick at least one person.");
      audience = { kind: "users", userIds: ids };
    } else audience = { kind: "all" };

    if (overLimit(`push-admin:${u.id}`, 6, 10 * 60_000)) return fail("That's several announcements in a few minutes. Please wait a little before sending another.");
    const ids = await audienceFor(type, audience);
    if (!ids.length) return fail("Nobody in that audience has notifications switched on yet.");
    inBackground("announcement", () => sendPushToUsers(ids, { type, title, body, url, tag: `announce-${Date.now()}` }, { ttl: 60 * 60 * 24 }));
    await logActivity(u.id, "Sent notification", "Notification", `${title} → ${ids.length} people (${to || "all"})`);
    return ok(`Sending to ${ids.length} ${ids.length === 1 ? "person" : "people"}. Delivery results appear below in a minute.`);
  });
}
