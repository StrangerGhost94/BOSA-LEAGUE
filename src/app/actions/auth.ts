"use server";

import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, players, teams } from "@/db/schema";
import { startSession, endSession } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { fail, str, optStr } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/components/form";

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
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(u.role));
}

export async function signUpAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const phone = optStr(fd, "phone");
  const password = str(fd, "password");
  const type = str(fd, "type");
  const university = optStr(fd, "university");
  if (name.length < 3) return fail("Please enter your full name.");
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");
  if (password.length < 8) return fail("Your password must be at least 8 characters.");
  if (!["STUDENT_FAN", "ALUMNI_FAN", "PLAYER"].includes(type)) return fail("Choose an account type.");
  if (fd.get("terms") !== "on") return fail("Please accept the membership terms to continue.");
  const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (exists) return fail("An account with this email already exists. Try signing in.");

  let playerId: string | null = null;
  let teamId: string | null = null;
  if (type === "PLAYER") {
    teamId = str(fd, "teamId");
    const position = str(fd, "position") as "GK" | "DEF" | "MID" | "FWD";
    const number = parseInt(str(fd, "number"), 10);
    const team = teamId ? await db.query.teams.findFirst({ where: eq(teams.id, teamId) }) : null;
    if (!team) return fail("Select the club you play for.");
    if (!["GK", "DEF", "MID", "FWD"].includes(position)) return fail("Select your position.");
    if (!(number >= 1 && number <= 99)) return fail("Choose a shirt number between 1 and 99.");
    const clash = await db.query.players.findFirst({ where: and(eq(players.teamId, team.id), eq(players.number, number)) });
    if (clash && clash.status !== "REJECTED") return fail(`Number ${number} is already taken at ${team.name}.`);
    const [first, ...rest] = name.split(" ");
    const [p] = await db
      .insert(players)
      .values({
        teamId: team.id,
        firstName: first,
        lastName: rest.join(" ") || first,
        number,
        position,
        affiliation: str(fd, "affiliation") === "ALUMNI" ? "ALUMNI" : "STUDENT",
        course: optStr(fd, "course"),
        status: "PENDING",
      })
      .returning();
    playerId = p.id;
  }

  const [u] = await db
    .insert(users)
    .values({
      name,
      email,
      phone,
      university,
      passwordHash: await bcrypt.hash(password, 10),
      role: type as "STUDENT_FAN" | "ALUMNI_FAN" | "PLAYER",
      playerId,
      teamId,
    })
    .returning();
  await logActivity(u.id, "Created account", "User", `${name} registered as ${type.replace("_", " ").toLowerCase()}`, u.id);
  await startSession(u);
  redirect("/membership?welcome=1");
}

export async function signOutAction() {
  endSession();
  redirect("/");
}
