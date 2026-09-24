"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, ok, str, optStr } from "@/lib/result";
import type { ActionResult } from "@/components/form";

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
