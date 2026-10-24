"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, teams } from "@/db/schema";
import { startSession, endSession } from "@/lib/auth";
import { isStaff, homeFor } from "@/lib/roles";
import { fail, str, optStr } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/components/form";
import { headers } from "next/headers";
import { normaliseCode, redeemVoucher, tooManyAttempts } from "@/lib/vouchers";
import { pool } from "@/db";
import { emailConfigured, hashCode, sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import { overLimit } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const next = str(fd, "next");
  if (!email || !password) return fail("Enter your email and password.");
  const u = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return fail("That email and password combination is not recognised.");
  if (!u.active) return fail("This account has been deactivated. Contact the League office.");
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await startSession(u);
  // Fans and players land on the home page; staff go straight to their panel
  const fallback = isStaff(u.role) ? homeFor(u.role) : "/";
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : fallback);
}

export async function signUpAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const phone = optStr(fd, "phone");
  const password = str(fd, "password");
  const completionYear = parseInt(str(fd, "completionYear"), 10);
  if (name.length < 3) return fail("Please enter your full name.");
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");
  if (password.length < 8) return fail("Your password must be at least 8 characters.");
  if (!(completionYear >= 1980 && completionYear <= new Date().getFullYear())) return fail("Select the year you joined Bilal Institute.");
  if (fd.get("terms") !== "on") return fail("Please accept the membership terms to continue.");
  // Optional membership voucher: checked before the account is created so a wrong code never leaves a half-made account
  const voucherRaw = str(fd, "voucher");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (voucherRaw) {
    if (tooManyAttempts(`ip:${ip}`)) return fail("Too many wrong voucher codes. Please wait 15 minutes and try again.");
    const code = normaliseCode(voucherRaw);
    const { rows } = code ? await pool.query("select status from vouchers where code=$1", [code]) : { rows: [] };
    if (!rows.length) return fail("We could not find that voucher code. Check it, or leave the box empty to activate later.");
    if (rows[0].status !== "UNUSED") return fail(rows[0].status === "USED" ? "This voucher has already been used. Each voucher works once." : "This voucher has been cancelled. Please contact the League office.");
  }
  const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (exists) return fail("An account with this email already exists. Try signing in.");

  // Everyone joins as an old student; their club is their intake's club. Players are added from the clubs' squad sheets.
  const intakeClub = await db.query.teams.findFirst({ where: eq(teams.intakeYear, completionYear) });

  const [u] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      completionYear,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ALUMNI_FAN",
      teamId: intakeClub?.id ?? null,
    })
    .returning();
  await logActivity(u.id, "Created account", "User", `${name} (${completionYear} intake) registered`, u.id);
  await sendVerificationEmail(u);
  await startSession(u);
  if (voucherRaw) {
    const r = await redeemVoucher(u.id, voucherRaw, `ip:${ip}`);
    if (r.ok) redirect("/members?welcome=1");
    redirect(`/membership?welcome=1&voucher=${encodeURIComponent(r.message)}`);
  }
  redirect("/membership?welcome=1");
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}

/** Forgot password, step 1: email a reset code. The reply is the same whether or not the address has an account. */
export async function requestPasswordResetAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");
  if (!emailConfigured()) return fail("Password reset by email is not switched on yet. Please contact the League office.");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (overLimit(`reset-ip:${ip}`, 10, 60 * 60_000) || overLimit(`reset-send:${email}`, 3, 15 * 60_000))
    return fail("We have sent several codes already. Please check your inbox and spam folder, or try again in 15 minutes.");
  const u = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (u?.active) await sendPasswordResetEmail(u);
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

/** Forgot password, step 2: the code from the email and a new password */
export async function resetPasswordAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const code = str(fd, "code").replace(/\D/g, "");
  const password = str(fd, "password");
  if (code.length !== 6) return fail("Enter the 6-digit code from the email.");
  if (password.length < 8) return fail("Your new password must be at least 8 characters.");
  if (password !== str(fd, "confirm")) return fail("The two passwords do not match.");
  if (overLimit(`reset-code:${email}`, 6, 15 * 60_000)) return fail("Too many wrong codes. Please wait 15 minutes and ask for a new code.");
  const u = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!u?.active || !u.resetCodeHash || !u.resetCodeExpires) return fail("That code is not right. Check the latest email we sent, or ask for a new code.");
  if (u.resetCodeExpires.getTime() < Date.now()) return fail("That code has expired. Ask for a new one.");
  if (hashCode(code) !== u.resetCodeHash) return fail("That code is not right. Check the latest email we sent, or ask for a new code.");
  // The code proves they can read this inbox, so the address also counts as confirmed
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 10), resetCodeHash: null, resetCodeExpires: null, emailVerifiedAt: u.emailVerifiedAt ?? new Date(), lastLoginAt: new Date() })
    .where(eq(users.id, u.id));
  await logActivity(u.id, "Reset password", "User", `${u.name} reset their password by email code`, u.id);
  await startSession(u);
  redirect(isStaff(u.role) ? homeFor(u.role) : "/");
}
