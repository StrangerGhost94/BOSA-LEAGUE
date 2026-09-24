import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role } from "@/db/schema";
import { SESSION_COOKIE, signSession, verifySession } from "./session";
import { can, type Permission, isStaff } from "./roles";
import { cache } from "react";

/**
 * Reads the signed-in user. For members (not staff) the session must be the latest one: signing in on
 * another phone raises the account's session version, and older sessions are treated as signed out.
 */
export const getSessionState = cache(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return { user: null, superseded: false };
  const u = await db.query.users.findFirst({
    where: eq(users.id, payload.uid),
    with: { team: true, player: true },
  });
  if (!u || !u.active) return { user: null, superseded: false };
  if (!isStaff(u.role) && (payload.sv ?? 0) !== u.sessionVersion) return { user: null, superseded: true };
  return { user: u, superseded: false };
});

export const getCurrentUser = cache(async () => (await getSessionState()).user);

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Starts a session on this device and records the sign-in. Members: every other device is signed out. */
export async function startSession(u: { id: string; role: Role; name: string }) {
  let sv = 0;
  if (isStaff(u.role)) {
    const row = await db.query.users.findFirst({ where: eq(users.id, u.id), columns: { sessionVersion: true } });
    sv = row?.sessionVersion ?? 0;
  } else {
    const [row] = await db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, u.id))
      .returning({ sv: users.sessionVersion });
    sv = row.sv;
  }
  const token = await signSession({ uid: u.id, role: u.role, name: u.name, sv });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const { recordSignIn } = await import("./security");
  await recordSignIn(u.id).catch((e) => console.error("sign-in log", e));
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function requireUser(next = "/account") {
  const { user, superseded } = await getSessionState();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}${superseded ? "&reason=elsewhere" : ""}`);
  return user;
}

export async function requireRole(roles: Role[], next = "/") {
  const u = await requireUser(next);
  if (!roles.includes(u.role)) redirect("/unauthorised");
  return u;
}

export async function requirePermission(perm: Permission) {
  const u = await requireUser("/admin");
  if (!can(u.role, perm)) redirect("/unauthorised");
  return u;
}

export function hasMembership(u: { role: string; membership: string } | null | undefined) {
  if (!u) return false;
  return isStaff(u.role) || u.membership === "ACTIVE";
}
