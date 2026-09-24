import "server-only";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { users } from "@/db/schema";

/** Gives a member a permanent, sequential member number the first time they need one. */
export async function ensureMemberNumber(userId: string): Promise<number> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { memberNumber: true } });
  if (u?.memberNumber) return u.memberNumber;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { rows } = await pool.query(
        "update users set member_number = (select coalesce(max(member_number), 0) + 1 from users) where id = $1 and member_number is null returning member_number",
        [userId],
      );
      if (rows[0]?.member_number) return rows[0].member_number as number;
      const again = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { memberNumber: true } });
      if (again?.memberNumber) return again.memberNumber;
    } catch {
      // two members activated at the same moment: try again
    }
  }
  throw new Error("Could not assign a member number. Please try again.");
}

export function formatMemberNumber(n: number) {
  return `BOSA-${String(n).padStart(4, "0")}`;
}

/**
 * The number printed on the card, airline style: BL · year joined · member number · check digit.
 * e.g. BL 2026 00001 4. The last digit (Luhn) catches a mistyped number.
 */
export function membershipId(n: number, joined: Date | null | undefined) {
  const year = new Intl.DateTimeFormat("en", { timeZone: "Africa/Kampala", year: "numeric" }).format(joined ?? new Date());
  const body = `${year}${String(n).padStart(5, "0")}`;
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let d = Number(body[body.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  const check = (10 - (sum % 10)) % 10;
  return `BL ${year} ${String(n).padStart(5, "0")} ${check}`;
}

function secret() {
  return process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
}

/** Short signature so a card code cannot be guessed or forged. */
export function cardCode(n: number) {
  const sig = createHmac("sha256", secret()).update(`member:${n}`).digest("hex").slice(0, 8).toUpperCase();
  return `${formatMemberNumber(n)}-${sig}`;
}

export function parseCardCode(code: string): number | null {
  const m = /^BOSA-(\d{1,8})-([0-9A-F]{8})$/i.exec(code.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return cardCode(n).toUpperCase() === code.trim().toUpperCase() ? n : null;
}

/** Early access: is this fixture or story visible to someone who is not a member yet? */
export function isPublicNow(item: { publicFrom: Date | null }) {
  return !item.publicFrom || item.publicFrom.getTime() <= Date.now();
}

/** Current month in Kampala as YYYY-MM */
export function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
}

/** Fans can vote for player of the match while it is live and for three days after kick-off. */
export function matchVoteOpen(m: { status: string; kickoff: Date }) {
  if (m.status === "LIVE" || m.status === "HALF_TIME") return true;
  return m.status === "FULL_TIME" && Date.now() < m.kickoff.getTime() + 3 * 24 * 3600 * 1000;
}
