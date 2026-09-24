import "server-only";
import { randomInt } from "crypto";
import { pool } from "@/db";

/** No 0/O, 1/I/L: easy to read off a printed card and type on a phone. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A code looks like BOSA-7KQ4-M9XT. Eight random characters: about 850 billion combinations. */
export function newCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `BOSA-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Accepts what people actually type: lower case, spaces, missing dashes, with or without the BOSA prefix. */
export function normaliseCode(input: string) {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("BOSA")) s = s.slice(4);
  if (s.length !== 8) return null;
  return `BOSA-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Creates `count` new unused vouchers in a named batch. Returns the codes. */
export async function generateVouchers(count: number, batch: string) {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(newCode());
  const list = [...codes];
  const created: string[] = [];
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    const { rows } = await pool.query(
      `insert into vouchers (id, code, batch) select gen_random_uuid()::text, c, $2 from unnest($1::text[]) c on conflict (code) do nothing returning code`,
      [chunk, batch],
    );
    created.push(...rows.map((r: { code: string }) => r.code));
  }
  return created;
}

/* Simple guard against guessing: at most 8 wrong codes per person or connection every 15 minutes. */
const failures = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string) {
  const f = failures.get(key);
  return !!f && f.until > Date.now() && f.n >= 8;
}
function recordFailure(key: string) {
  const f = failures.get(key);
  if (!f || f.until < Date.now()) failures.set(key, { n: 1, until: Date.now() + 15 * 60_000 });
  else f.n++;
}

export type RedeemResult = { ok: true } | { ok: false; message: string };

/**
 * Uses a voucher for a user, all or nothing: the code is marked used and the membership activated
 * in one transaction, so a code can never be used twice, even if two people try at the same moment.
 */
export async function redeemVoucher(userId: string, rawCode: string, attemptKey: string): Promise<RedeemResult> {
  if (tooManyAttempts(attemptKey)) return { ok: false, message: "Too many wrong codes. Please wait 15 minutes and try again." };
  const code = normaliseCode(rawCode);
  if (!code) {
    recordFailure(attemptKey);
    return { ok: false, message: "That does not look like a BOSA voucher code. It should look like BOSA-7KQ4-M9XT." };
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      "update vouchers set status='USED', used_by_id=$2, used_at=now() where code=$1 and status='UNUSED' returning id",
      [code, userId],
    );
    if (!rows.length) {
      await client.query("rollback");
      const { rows: r } = await pool.query("select status from vouchers where code=$1", [code]);
      recordFailure(attemptKey);
      if (r[0]?.status === "USED") return { ok: false, message: "This voucher has already been used. Each voucher works once." };
      if (r[0]?.status === "VOID") return { ok: false, message: "This voucher has been cancelled. Please contact the League office." };
      return { ok: false, message: "We could not find that voucher code. Please check it and try again." };
    }
    await client.query("update users set membership='ACTIVE', membership_paid_at=coalesce(membership_paid_at, now()) where id=$1", [userId]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  const { ensureMemberNumber } = await import("./members");
  await ensureMemberNumber(userId);
  const { logActivity } = await import("./activity");
  await logActivity(userId, "Membership activated", "User", `Voucher ${code}`, userId);
  return { ok: true };
}
