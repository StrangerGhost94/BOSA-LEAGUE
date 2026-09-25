/**
 * Web Push (VAPID) for BOSA: iPhone/iPad apps added to the Home Screen (iOS 16.4+) and Android/desktop browsers.
 *
 * Server only. The private key is read from the environment here and nowhere else; it never reaches a
 * browser and is never logged. Payloads carry only what a lock screen may show (titles, scores, a link).
 *
 * Not marked "server-only" because the reminder job (src/instrumentation.ts) loads it outside React.
 * No client component imports this file.
 */
import webpush from "web-push";
import { randomUUID } from "crypto";
import { pool } from "@/db";

export type PushType = "MATCH_REMINDER" | "MATCH_STATUS" | "MATCH_RESULT" | "GOAL" | "RED_CARD" | "FIXTURE" | "LEAGUE_ANNOUNCEMENT" | "TEAM_UPDATE" | "GENERAL";

export const PUSH_TYPE_LABEL: Record<PushType, string> = {
  MATCH_REMINDER: "Match reminder",
  MATCH_STATUS: "Kick-off / half-time",
  MATCH_RESULT: "Result",
  GOAL: "Goal",
  RED_CARD: "Red card",
  FIXTURE: "Fixture news",
  LEAGUE_ANNOUNCEMENT: "League announcement",
  TEAM_UPDATE: "Club update",
  GENERAL: "General",
};

/** Which setting on the account page controls each kind of notification. */
const PREF_COLUMN: Record<PushType, string> = {
  MATCH_REMINDER: "match_reminders",
  FIXTURE: "match_reminders",
  MATCH_STATUS: "match_results",
  MATCH_RESULT: "match_results",
  GOAL: "goals",
  RED_CARD: "goals",
  LEAGUE_ANNOUNCEMENT: "league_announcements",
  TEAM_UPDATE: "team_updates",
  GENERAL: "general_notifications",
};

export type PushPayload = {
  type: PushType;
  title: string;
  body: string;
  /** A path on this site, e.g. /matches/abc. Anything else is replaced with "/". */
  url?: string;
  /** Notifications with the same tag replace each other (e.g. goals in one match). */
  tag?: string;
};

type SendOptions = { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" };

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

/* ------------------------------------------------------------------ setup */

let configured: boolean | null = null;

/**
 * Reads a setting and forgives copy-paste slips: spaces, line breaks and quotes are removed, and a pasted
 * "NAME=value" becomes just the value. Keys never contain spaces, so removing them is safe.
 */
function envKey(name: string) {
  let v = (process.env[name] ?? "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (v.startsWith(name + "=")) v = v.slice(name.length + 1).replace(/^["'`]+|["'`]+$/g, "");
  if (name !== "VAPID_SUBJECT") v = v.replace(/\s+/g, "");
  return v || undefined;
}

/** Describes what is wrong with a key without revealing it (safe to log). */
function keyProblem(name: string, v: string, expectedLength: number) {
  const bad = [...new Set(v.replace(/[A-Za-z0-9_-]/g, ""))].map((c) => JSON.stringify(c)).join(" ");
  return `${name}: ${v.length} characters (expected ${expectedLength})${bad ? `, contains ${bad}` : ""}`;
}

/** True when all three VAPID settings are present and valid. Without them, push quietly stays off. */
export function pushConfigured() {
  if (configured !== null) return configured;
  const pub = envKey("VAPID_PUBLIC_KEY");
  const priv = envKey("VAPID_PRIVATE_KEY");
  const subject = envKey("VAPID_SUBJECT");
  if (!pub || !priv || !subject) {
    console.warn("[push] VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY or VAPID_SUBJECT not set: push notifications are off.");
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch (e) {
    // web-push's messages describe the problem ("should be 32 bytes") without echoing the key
    console.error("[push] VAPID settings rejected:", (e as Error).message, "|", keyProblem("VAPID_PUBLIC_KEY", pub, 87), "|", keyProblem("VAPID_PRIVATE_KEY", priv, 43), "| subject starts with mailto: or https:", /^(mailto:|https:)/.test(subject));
    configured = false;
  }
  return configured;
}

/** The public key is meant to be public: browsers need it to subscribe. */
export function vapidPublicKey() {
  return envKey("VAPID_PUBLIC_KEY") ?? null;
}

/* ------------------------------------------------------------------ validation */

/** Push services we accept endpoints from. Anything else is refused, so the server can't be made to POST to arbitrary URLs. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export function validSubscription(input: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!input || typeof input !== "object") return null;
  const o = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof o.endpoint === "string" ? o.endpoint : "";
  const p256dh = typeof o.keys?.p256dh === "string" ? o.keys.p256dh : "";
  const auth = typeof o.keys?.auth === "string" ? o.keys.auth : "";
  if (endpoint.length > 1000 || p256dh.length < 40 || p256dh.length > 200 || auth.length < 8 || auth.length > 64) return null;
  if (!B64URL.test(p256dh) || !B64URL.test(auth)) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !PUSH_HOSTS.some((h) => h.test(url.hostname))) return null;
  return { endpoint, p256dh, auth };
}

export function describeDevice(ua: string) {
  const platform = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop";
  const browser = /EdgA?\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /CriOS|Chrome/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : "Browser";
  return { platform, browser };
}

function cleanPayload(p: PushPayload) {
  const url = p.url && p.url.startsWith("/") && !p.url.startsWith("//") ? p.url.slice(0, 300) : "/";
  return JSON.stringify({
    type: p.type,
    title: p.title.slice(0, 80),
    body: p.body.slice(0, 200),
    url,
    tag: p.tag?.slice(0, 64),
  });
}

/* ------------------------------------------------------------------ sending */

async function logRow(notificationId: string, userId: string | null, subscriptionId: string | null, type: PushType, status: string, reason?: string) {
  await pool
    .query(
      `insert into notification_logs (id, notification_id, user_id, subscription_id, notification_type, status, sent_at, failure_reason)
       values (gen_random_uuid()::text, $1, $2, $3, $4, $5, case when $5 = 'sent' then now() end, $6)`,
      [notificationId, userId, subscriptionId, type, status, reason ?? null],
    )
    .catch((e) => console.error("[push] log write failed:", e.message));
}

/**
 * Sends to one device. A device the push service reports as gone (404/410) is revoked so we stop trying.
 * One device failing never affects the others.
 */
export async function sendPushToSubscription(sub: Sub, payload: PushPayload, opts: SendOptions = {}, notificationId: string = randomUUID()) {
  if (!pushConfigured()) return { ok: false as const, status: "failed", reason: "Push not configured" };
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, cleanPayload(payload), {
      TTL: opts.ttl ?? 60 * 60 * 6,
      urgency: opts.urgency ?? "normal",
      timeout: 10_000,
    });
    await pool.query("update push_subscriptions set last_used_at = now() where id = $1", [sub.id]);
    await logRow(notificationId, sub.user_id, sub.id, payload.type, "sent");
    return { ok: true as const, status: "sent" };
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await pool.query("update push_subscriptions set revoked_at = now(), updated_at = now() where id = $1", [sub.id]);
      await logRow(notificationId, sub.user_id, sub.id, payload.type, "expired", `Push service: ${code} (device unsubscribed)`);
      return { ok: false as const, status: "expired", reason: `HTTP ${code}` };
    }
    const reason = code ? `Push service: HTTP ${code}` : `Network: ${((e as Error).message || "error").slice(0, 120)}`;
    // Endpoint hosts only, never keys or payloads
    console.error(`[push] send failed to ${new URL(sub.endpoint).hostname}: ${reason}`);
    await logRow(notificationId, sub.user_id, sub.id, payload.type, "failed", reason);
    return { ok: false as const, status: "failed", reason };
  }
}

/**
 * Sends to every active device of one person.
 * With a dedupeKey the send happens at most once, however many times it is attempted.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
  opts: SendOptions & { dedupeKey?: string; notificationId?: string; ignorePreferences?: boolean } = {},
) {
  const result = { sent: 0, failed: 0, skipped: "" as string };
  if (!pushConfigured()) return { ...result, skipped: "not configured" };
  const notificationId = opts.notificationId ?? randomUUID();

  let claimId: string | null = null;
  if (opts.dedupeKey) {
    const { rows } = await pool.query(
      `insert into notification_logs (id, notification_id, user_id, notification_type, status, dedupe_key)
       values (gen_random_uuid()::text, $1, $2, $3, 'queued', $4) on conflict (dedupe_key) do nothing returning id`,
      [notificationId, userId, payload.type, opts.dedupeKey.slice(0, 300)],
    );
    if (!rows.length) return { ...result, skipped: "already sent" };
    claimId = rows[0].id;
  }

  if (!opts.ignorePreferences) {
    const col = PREF_COLUMN[payload.type];
    const { rows } = await pool.query(`select ${col} as on from notification_preferences where user_id = $1`, [userId]);
    if (rows.length && rows[0].on === false) {
      if (claimId) await pool.query("update notification_logs set status='revoked', failure_reason='Turned off in settings' where id=$1", [claimId]);
      return { ...result, skipped: "turned off" };
    }
  }

  const { rows: subs } = await pool.query<Sub>("select id, user_id, endpoint, p256dh, auth from push_subscriptions where user_id = $1 and revoked_at is null", [userId]);
  const outcomes = await Promise.all(subs.map((s) => sendPushToSubscription(s, payload, opts, notificationId)));
  result.sent = outcomes.filter((o) => o.ok).length;
  result.failed = outcomes.length - result.sent;
  if (claimId) {
    await pool.query("update notification_logs set status=$2, sent_at=case when $2='sent' then now() end, failure_reason=$3 where id=$1", [
      claimId,
      result.sent ? "sent" : "failed",
      subs.length ? (result.sent ? null : "Every device failed") : "No devices",
    ]);
  }
  return result;
}

/** Sends to many people, a few at a time so a big send doesn't flood the server. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload, opts: SendOptions & { dedupe?: (userId: string) => string; ignorePreferences?: boolean } = {}) {
  const notificationId = randomUUID();
  const totals = { notificationId, people: userIds.length, sent: 0, failed: 0 };
  const queue = [...new Set(userIds)];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        const r = await sendPushNotification(id, payload, { ...opts, notificationId, dedupeKey: opts.dedupe?.(id) });
        totals.sent += r.sent;
        totals.failed += r.failed;
      } catch (e) {
        console.error("[push] send to one person failed:", (e as Error).message);
        totals.failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  if (userIds.length) console.log(`[push] ${payload.type} "${payload.title}": ${totals.sent} delivered, ${totals.failed} failed, ${totals.people} people`);
  return totals;
}

/** Runs a send after the admin's request has returned. Errors are logged, never thrown at the admin. */
export function inBackground(label: string, work: () => Promise<unknown>) {
  if (!pushConfigured()) return;
  setTimeout(() => work().catch((e) => console.error(`[push] ${label}:`, (e as Error).message)), 0);
}

/* ------------------------------------------------------------------ audiences */

export type Audience = { kind: "all" } | { kind: "teams"; teamIds: string[] } | { kind: "users"; userIds: string[] };

const STAFF = "('SUPER_ADMIN','LEAGUE_ADMIN','COMPETITION_MANAGER','TEAM_MANAGER','REFEREE')";

/**
 * People who can receive a notification of this type: active members (staff count as members) with at least
 * one active device and that kind of notification switched on.
 */
export async function audienceFor(type: PushType, audience: Audience = { kind: "all" }) {
  const col = PREF_COLUMN[type];
  const params: unknown[] = [];
  let filter = "";
  if (audience.kind === "teams") {
    params.push(audience.teamIds);
    filter = `and (u.team_id = any($1::text[]) or p.team_id = any($1::text[]))`;
  } else if (audience.kind === "users") {
    params.push(audience.userIds);
    filter = `and u.id = any($1::text[])`;
  }
  const { rows } = await pool.query<{ id: string }>(
    `select distinct u.id from users u
       join push_subscriptions s on s.user_id = u.id and s.revoked_at is null
       left join players p on p.id = u.player_id
       left join notification_preferences np on np.user_id = u.id
     where u.active and (u.membership = 'ACTIVE' or u.role in ${STAFF}) and coalesce(np.${col}, true) ${filter}`,
    params,
  );
  return rows.map((r) => r.id);
}

/* ------------------------------------------------------------------ match events */

type MatchRow = { id: string; home: string; away: string; home_id: string; away_id: string; hs: number | null; as: number | null; hp: number | null; ap: number | null; kickoff: Date; round: string; matchday: number | null };

async function loadMatch(matchId: string) {
  const { rows } = await pool.query<MatchRow>(
    `select m.id, h.name home, a.name away, h.id home_id, a.id away_id, m.home_score hs, m.away_score "as", m.home_pens hp, m.away_pens ap, m.kickoff, m.round, m.matchday
       from matches m join teams h on h.id = m.home_team_id join teams a on a.id = m.away_team_id where m.id = $1`,
    [matchId],
  );
  return rows[0] ?? null;
}

/** A goal was recorded by the Control Room or a referee. */
export async function notifyGoal(eventId: string) {
  const { rows } = await pool.query(
    `select e.id, e.match_id, e.type, e.minute, e.team_id, pl.first_name, pl.last_name
       from match_events e left join players pl on pl.id = e.player_id where e.id = $1`,
    [eventId],
  );
  const e = rows[0];
  if (!e || !["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(e.type)) return;
  const m = await loadMatch(e.match_id);
  if (!m) return;
  const name = [e.first_name, e.last_name].filter(Boolean).join(" ");
  const scorer = e.type === "OWN_GOAL" ? "Own goal" : name ? name + (e.type === "PENALTY_GOAL" ? " (pen)" : "") : e.type === "PENALTY_GOAL" ? "Penalty" : "";
  const team = e.team_id === m.home_id ? m.home : m.away;
  const ids = await audienceFor("GOAL");
  await sendPushToUsers(
    ids,
    { type: "GOAL", title: `Goal! ${team}`, body: `${m.home} ${m.hs ?? 0}-${m.as ?? 0} ${m.away} · ${scorer ? `${scorer} ` : ""}${e.minute}'`, url: `/matches/${m.id}`, tag: `match-${m.id}` },
    { ttl: 60 * 15, urgency: "high", dedupe: (uid) => `goal:${e.id}:${uid}` },
  );
}

/** Full time was recorded. */
export async function notifyResult(matchId: string) {
  const m = await loadMatch(matchId);
  if (!m || m.hs == null || m.as == null) return;
  const pens = m.hp != null && m.ap != null ? ` (${m.hp}-${m.ap} on penalties)` : "";
  const ids = await audienceFor("MATCH_RESULT");
  await sendPushToUsers(
    ids,
    { type: "MATCH_RESULT", title: `Full time · ${m.round}`, body: `${m.home} ${m.hs}-${m.as} ${m.away}${pens}`, url: `/matches/${m.id}`, tag: `match-${m.id}` },
    { ttl: 60 * 60 * 24, dedupe: (uid) => `result:${m.id}:${uid}` },
  );
}

/** Kick-off, half-time, postponed or cancelled. Each is sent once per match (and once per new date). */
export async function notifyMatchStatus(matchId: string, status: string) {
  const m = await loadMatch(matchId);
  if (!m) return;
  const score = `${m.home} ${m.hs ?? 0}-${m.as ?? 0} ${m.away}`;
  let payload: PushPayload;
  let key: string;
  let ttl = 60 * 30;
  if (status === "LIVE") {
    payload = { type: "MATCH_STATUS", title: `Kick-off · ${m.round}`, body: `${m.home} v ${m.away} is under way.`, url: `/matches/${m.id}`, tag: `match-${m.id}` };
    key = "kickoff";
  } else if (status === "HALF_TIME") {
    payload = { type: "MATCH_STATUS", title: "Half-time", body: score, url: `/matches/${m.id}`, tag: `match-${m.id}` };
    key = "halftime";
  } else if (status === "POSTPONED" || status === "CANCELLED") {
    const word = status === "POSTPONED" ? "Postponed" : "Cancelled";
    payload = { type: "FIXTURE", title: `${word}: ${m.home} v ${m.away}`, body: `${m.round} on ${fmtDay(m.kickoff)} will not go ahead as planned. Tap for details.`, url: `/matches/${m.id}`, tag: `match-${m.id}` };
    key = `${status.toLowerCase()}:${m.kickoff.toISOString()}`;
    ttl = 60 * 60 * 24;
  } else return;
  const ids = await audienceFor(payload.type);
  await sendPushToUsers(ids, payload, { ttl, urgency: status === "LIVE" || status === "HALF_TIME" ? "high" : "normal", dedupe: (uid) => `status:${m.id}:${key}:${uid}` });
}

/** A red card (straight or second yellow) during a match. */
export async function notifyRedCard(eventId: string) {
  const { rows } = await pool.query(
    `select e.id, e.match_id, e.type, e.minute, e.team_id, pl.first_name, pl.last_name
       from match_events e left join players pl on pl.id = e.player_id where e.id = $1`,
    [eventId],
  );
  const e = rows[0];
  if (!e || !["RED", "SECOND_YELLOW"].includes(e.type)) return;
  const m = await loadMatch(e.match_id);
  if (!m) return;
  const team = e.team_id === m.home_id ? m.home : m.away;
  const who = [e.first_name, e.last_name].filter(Boolean).join(" ") || "A player";
  await sendPushToUsers(
    await audienceFor("RED_CARD"),
    { type: "RED_CARD", title: `Red card · ${team}`, body: `${who} ${e.minute}'${e.type === "SECOND_YELLOW" ? " (second yellow)" : ""} · ${m.home} ${m.hs ?? 0}-${m.as ?? 0} ${m.away}`, url: `/matches/${m.id}`, tag: `match-${m.id}` },
    { ttl: 60 * 15, urgency: "high", dedupe: (uid) => `red:${e.id}:${uid}` },
  );
}

/** A scheduled match was moved to a new time. */
export async function notifyRescheduled(matchId: string) {
  const m = await loadMatch(matchId);
  if (!m || m.kickoff.getTime() < Date.now()) return;
  await sendPushToUsers(
    await audienceFor("FIXTURE"),
    { type: "FIXTURE", title: `New time: ${m.home} v ${m.away}`, body: `${m.round} now kicks off ${fmtDay(m.kickoff)} at ${hhmm(m.kickoff)}.`, url: `/matches/${m.id}`, tag: `match-${m.id}` },
    { ttl: 60 * 60 * 24, dedupe: (uid) => `moved:${m.id}:${m.kickoff.toISOString()}:${uid}` },
  );
}

/** A Newsroom story the season engine published by itself (season announced, champions crowned, Champions League draw...). */
export async function notifyLeagueNews(slug: string, title: string, excerpt: string) {
  await sendPushToUsers(
    await audienceFor("LEAGUE_ANNOUNCEMENT"),
    { type: "LEAGUE_ANNOUNCEMENT", title: title.slice(0, 80), body: excerpt, url: `/news/${slug}`, tag: `news-${slug}`.slice(0, 64) },
    { ttl: 60 * 60 * 24 * 2, dedupe: (uid) => `news:${slug}:${uid}` },
  );
}

/* ------------------------------------------------------------------ reminders */

const TZ = "Africa/Kampala";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const fmtDay = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
const hhmm = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/**
 * Reminders 24 hours and 1 hour before kick-off. Safe to run as often as you like: each reminder is
 * claimed once per person with the key match + type + kick-off time + person, so a rescheduled match
 * gets fresh reminders and nothing is ever sent twice.
 *
 * - About a day before a matchday: one message per person for the day (not one per match).
 * - An hour before each match: fans of the two clubs. An hour before the day's first match: everyone else.
 */
export async function runMatchReminders(now = new Date()) {
  if (!pushConfigured()) return { sent: 0 };
  const { rows } = await pool.query<MatchRow>(
    `select m.id, h.name home, a.name away, h.id home_id, a.id away_id, m.kickoff, m.round, m.matchday,
            null::int hs, null::int "as", null::int hp, null::int ap
       from matches m join teams h on h.id = m.home_team_id join teams a on a.id = m.away_team_id
      where m.status = 'SCHEDULED' and m.kickoff > $1 and m.kickoff <= $1::timestamptz + interval '24 hours'
      order by m.kickoff`,
    [now],
  );
  if (!rows.length) return { sent: 0 };
  let sent = 0;
  const today = dayKey(now);
  const byDay = new Map<string, MatchRow[]>();
  for (const m of rows) byDay.set(dayKey(m.kickoff), [...(byDay.get(dayKey(m.kickoff)) ?? []), m]);

  // A day whose first match has already kicked off gets no "matchday" messages (only per-match 1-hour ones)
  const { rows: earlier } = await pool.query<{ day: string }>(
    `select distinct to_char(kickoff at time zone '${TZ}', 'YYYY-MM-DD') as day
       from matches where status <> 'CANCELLED' and kickoff <= $1 and kickoff > $1::timestamptz - interval '18 hours'`,
    [now],
  );
  const dayStarted = new Set(earlier.map((r) => r.day));

  for (const [day, list] of byDay) {
    const first = list[0];
    const when = day === today ? "today" : "tomorrow";
    const left = first.kickoff.getTime() - now.getTime();
    const title = first.matchday ? `Matchday ${first.matchday} ${when}` : `${first.round} ${when}`;

    // 24-hour reminder: sent once the day's first match is less than a day away (and more than 2 hours)
    if (!dayStarted.has(day) && left > 2 * 3600_000) {
      const body =
        list.length === 1 ? `${first.home} v ${first.away}, ${when} at ${hhmm(first.kickoff)}.` : `${list.length} matches ${when}, first kick-off ${hhmm(first.kickoff)}: ${first.home} v ${first.away}.`;
      const r = await sendPushToUsers(
        await audienceFor("MATCH_REMINDER"),
        { type: "MATCH_REMINDER", title, body, url: list.length === 1 ? `/matches/${first.id}` : "/fixtures", tag: `day-${day}` },
        { ttl: 60 * 60 * 6, dedupe: (uid) => `reminder:${first.id}:24h:${first.kickoff.toISOString()}:${uid}` },
      );
      sent += r.sent;
    }

    // 1-hour reminders
    for (const m of list) {
      if (m.kickoff.getTime() - now.getTime() > 3600_000) continue;
      const fans = await audienceFor("MATCH_REMINDER", { kind: "teams", teamIds: [m.home_id, m.away_id] });
      const payload: PushPayload = { type: "MATCH_REMINDER", title: "Kick-off in 1 hour", body: `${m.home} v ${m.away} at ${hhmm(m.kickoff)}.`, url: `/matches/${m.id}`, tag: `match-${m.id}` };
      sent += (await sendPushToUsers(fans, payload, { ttl: 60 * 60, urgency: "high", dedupe: (uid) => `reminder:${m.id}:1h:${m.kickoff.toISOString()}:${uid}` })).sent;
      if (m === first && !dayStarted.has(day)) {
        const fanSet = new Set(fans);
        const everyone = (await audienceFor("MATCH_REMINDER")).filter((id) => !fanSet.has(id));
        const body = list.length === 1 ? `${m.home} v ${m.away} at ${hhmm(m.kickoff)}.` : `First match ${hhmm(m.kickoff)}: ${m.home} v ${m.away}. ${list.length} matches today.`;
        sent += (
          await sendPushToUsers(everyone, { ...payload, body, url: list.length === 1 ? `/matches/${m.id}` : "/fixtures", tag: `day-${day}` }, {
            ttl: 60 * 60,
            urgency: "high",
            dedupe: (uid) => `reminder:${m.id}:1h-day:${m.kickoff.toISOString()}:${uid}`,
          })
        ).sent;
      }
    }
  }
  return { sent };
}
