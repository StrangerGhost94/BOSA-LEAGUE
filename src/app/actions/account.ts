"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, ok, str, optStr } from "@/lib/result";
import type { ActionResult } from "@/components/form";
import { emailConfigured, hashCode, sendVerificationEmail } from "@/lib/email";
import { overLimit } from "@/lib/rate-limit";

export async function updateProfileAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  const name = str(fd, "name");
  if (name.length < 3) return fail("Please enter your full name.");
  await db.update(users).set({ name, phone: optStr(fd, "phone"), completionYear: parseInt(str(fd, "completionYear"), 10) || null }).where(eq(users.id, u.id));
  revalidatePath("/account");
  return ok("Profile updated.");
}

export async function changePasswordAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  const current = str(fd, "current");
  const next = str(fd, "next");
  if (!(await bcrypt.compare(current, u.passwordHash))) return fail("Your current password is incorrect.");
  if (next.length < 8) return fail("Your new password must be at least 8 characters.");
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(users.id, u.id));
  return ok("Password changed.");
}

/** Sends the confirm-your-email link again; a mistyped address can be corrected here first (only while unconfirmed) */
export async function resendVerificationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  if (u.emailVerifiedAt) return ok("Your email is already confirmed.");
  if (!emailConfigured()) return fail("Email is not switched on yet. Please try again later.");
  if (overLimit(`verify-email:${u.id}`, 4, 60 * 60_000)) return fail("We have sent several links already. Please check your inbox and spam folder, or try again in an hour.");
  let email = u.email;
  const typed = str(fd, "email").toLowerCase();
  if (typed && typed !== u.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) return fail("Please enter a valid email address.");
    if (await db.query.users.findFirst({ where: eq(users.email, typed) })) return fail("Another account already uses that email.");
    await db.update(users).set({ email: typed }).where(eq(users.id, u.id));
    email = typed;
  }
  if (!(await sendVerificationEmail({ id: u.id, name: u.name, email }))) return fail("We could not send the email just now. Please try again in a few minutes.");
  revalidatePath("/account");
  return ok(`We sent a new link to ${email}. Check your inbox and spam folder.`);
}

/** Confirms the email with the 6-digit code from the latest email */
export async function confirmEmailCodeAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const u = await requireUser();
  if (u.emailVerifiedAt) return ok("Your email is already confirmed.");
  const code = str(fd, "code").replace(/\D/g, "");
  if (code.length !== 6) return fail("Enter the 6-digit code from the email.");
  if (overLimit(`email-code:${u.id}`, 6, 15 * 60_000)) return fail("Too many wrong codes. Please wait 15 minutes, or use the link in the email.");
  if (!u.emailCodeHash || !u.emailCodeExpires || u.emailCodeExpires.getTime() < Date.now()) return fail("That code has expired. Send yourself a new one below.");
  if (hashCode(code) !== u.emailCodeHash) return fail("That code is not right. Check the latest email we sent.");
  await db.update(users).set({ emailVerifiedAt: new Date(), emailCodeHash: null, emailCodeExpires: null }).where(eq(users.id, u.id));
  revalidatePath("/account");
  return ok("Email confirmed. Thank you.");
}
