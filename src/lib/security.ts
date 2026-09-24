import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { pool } from "@/db";

/** A readable name for the device, e.g. "iPhone · Safari" or "Android · Chrome". */
export function deviceLabel(ua: string) {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Other";
  const br = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Browser";
  const model = /Android[^;]*;\s*([^;)]+?)(?: Build|\))/.exec(ua)?.[1]?.trim();
  return [model && model.length < 30 && model !== "K" ? model : os, br].join(" · ");
}

export async function recordSignIn(userId: string) {
  const h = headers();
  const ua = h.get("user-agent") ?? "";
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const device = createHash("sha256").update(ua).digest("hex").slice(0, 16);
  await pool.query("insert into login_events (id, user_id, device, device_label, ip) values (gen_random_uuid()::text, $1, $2, $3, $4)", [userId, device, deviceLabel(ua), ip]);
  // Keep the log small: 90 days is plenty to spot sharing
  if (Math.random() < 0.02) await pool.query("delete from login_events where created_at < now() - interval '90 days'");
}

export type SharingFlag = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  memberNumber: number | null;
  devices: number;
  places: number;
  signIns: number;
  switches: number;
  lastAt: Date;
  reasons: string[];
};

/**
 * Members whose sign-ins in the last 7 days look like more than one person:
 * several different phones, or sign-ins that keep switching between phones (each one signs the other out).
 * Staff accounts are left out.
 */
export async function getSharingFlags(): Promise<SharingFlag[]> {
  const { rows } = await pool.query(`
    with ev as (
      select e.*, lag(e.device) over (partition by e.user_id order by e.created_at) prev_device
      from login_events e where e.created_at > now() - interval '7 days'
    )
    select u.id, u.name, u.email, u.active, u.member_number "memberNumber",
      count(distinct ev.device)::int devices,
      count(distinct ev.ip)::int places,
      count(*)::int "signIns",
      count(*) filter (where ev.prev_device is not null and ev.prev_device <> ev.device)::int switches,
      max(ev.created_at) "lastAt"
    from ev join users u on u.id = ev.user_id
    where u.role in ('ALUMNI_FAN','STUDENT_FAN','PLAYER')
    group by u.id
    having count(distinct ev.device) >= 3 or count(*) filter (where ev.prev_device is not null and ev.prev_device <> ev.device) >= 4
    order by count(*) filter (where ev.prev_device is not null and ev.prev_device <> ev.device) desc, max(ev.created_at) desc
  `);
  return rows.map((r: Omit<SharingFlag, "reasons">) => ({
    ...r,
    reasons: [
      r.devices >= 3 ? `${r.devices} different phones or browsers` : null,
      r.switches >= 4 ? `switched between phones ${r.switches} times` : null,
      r.places >= 4 ? `${r.places} different networks` : null,
    ].filter(Boolean) as string[],
  }));
}

export async function countSharingFlags() {
  return (await getSharingFlags()).filter((f) => f.active).length;
}

export async function recentSignIns(userId: string, limit = 12) {
  const { rows } = await pool.query("select device_label, ip, created_at from login_events where user_id=$1 order by created_at desc limit $2", [userId, limit]);
  return rows as { device_label: string; ip: string | null; created_at: Date }[];
}
