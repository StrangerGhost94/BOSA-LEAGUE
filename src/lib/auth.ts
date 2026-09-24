import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role } from "@/db/schema";
import { SESSION_COOKIE, signSession, verifySession } from "./session";
import { can, type Permission, isStaff } from "./roles";
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;
  const u = await db.query.users.findFirst({
    where: eq(users.id, payload.uid),
    with: { team: true, player: true },
  });
  if (!u || !u.active) return null;
  return u;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function startSession(u: { id: string; role: Role; name: string }) {
  const token = await signSession({ uid: u.id, role: u.role, name: u.name });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function requireUser(next = "/account") {
  const u = await getCurrentUser();
  if (!u) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireRole(roles: Role[], next = "/") {
  const u = await requireUser(next);
  if (!roles.includes(u.role)) redirect("/unauthorised");
  return u;
}

export async function requirePermission(perm: Permission) {
  const u = await requireUser("/admin");
  if (!can(u.role, perm)) throw new Error("You do not have permission to do that.");
  return u;
}

export function hasMembership(u: { role: string; membership: string } | null | undefined) {
  if (!u) return false;
  return isStaff(u.role) || u.membership === "ACTIVE";
}
