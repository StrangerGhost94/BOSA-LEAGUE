const TZ = "Africa/Kampala";

export function fmtDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(d));
}
export function fmtTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));
}
export function fmtLong(d: Date | string) {
  return fmtDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function fmtDateTime(d: Date | string) {
  return `${fmtDate(d, { day: "numeric", month: "short", year: "numeric" })} · ${fmtTime(d)}`;
}
export function dayKey(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}
/** Value for <input type="datetime-local"> in Kampala time */
export function toLocalInput(d: Date | string) {
  const k = dayKey(d);
  return `${k}T${fmtTime(d)}`;
}
/** Parse a datetime-local value as Kampala time */
export function fromLocalInput(v: string) {
  return new Date(`${v}:00+03:00`);
}
export function timeAgo(d: Date | string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d, { day: "numeric", month: "short", year: "numeric" });
}
export function ugx(n: number) {
  return `UGX ${n.toLocaleString("en-US")}`;
}
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
export const CATEGORY_LABEL: Record<string, string> = {
  MATCH_REPORT: "Match Report",
  ANNOUNCEMENT: "Announcement",
  TRANSFER: "Registration",
  COMPETITION: "Competition",
  INTERVIEW: "Interview",
  EDITORIAL: "Editorial",
};
export const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  HALF_TIME: "Half-time",
  FULL_TIME: "Full-time",
  POSTPONED: "Postponed",
  CANCELLED: "Cancelled",
};
export const POSITION_LABEL: Record<string, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };
export const STAGE_LABEL: Record<string, string> = {
  LEAGUE: "League",
  GROUP: "Group Stage",
  QUARTER_FINAL: "Quarter-final",
  SEMI_FINAL: "Semi-final",
  FINAL: "Final",
};

/** Running match minute: counts on from the last time the clock was set; stops at 45 in the first half and 90 in the second. */
export function liveMinute(m: { status: string; minute: number | null; clockAt?: Date | string | null }) {
  if (m.status === "HALF_TIME") return 45;
  if (m.status !== "LIVE" || m.minute == null) return m.minute;
  if (!m.clockAt) return m.minute;
  const run = m.minute + Math.floor((Date.now() - new Date(m.clockAt).getTime()) / 60000);
  const cap = m.minute <= 45 ? 45 : 90;
  return Math.max(m.minute, Math.min(run, cap));
}
