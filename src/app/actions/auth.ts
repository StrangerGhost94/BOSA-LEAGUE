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
  const completionYear = parseInt(str(fd, "completionYear"), 10);
  if (name.length < 3) return fail("Please enter your full name.");
  if (!EMAIL.test(email)) return fail("Please enter a valid email address.");
  if (password.length < 8) return fail("Your password must be at least 8 characters.");
  if (!["ALUMNI_FAN", "PLAYER"].includes(type)) return fail("Choose whether you are joining as an old student or a player.");
  if (!(completionYear >= 1980 && completionYear <= new Date().getFullYear())) return fail("Select the year you joined Bilal Institute.");
  if (fd.get("terms") !== "on") return fail("Please accept the membership terms to continue.");
  const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (exists) return fail("An account with this email already exists. Try signing in.");

  let playerId: string | null = null;
  let teamId: string | null = null;
  if (type === "PLAYER") {
    teamId = str(fd, "teamId");
    const position = str(fd, "position") as "GK" | "DEF" | "MID" | "FWD";
    const number = parseInt(str(fd, "number"), 10) || 0;
    const team = teamId ? await db.query.teams.findFirst({ where: eq(teams.id, teamId) }) : null;
    if (!team) return fail("Select the club you play for.");
    const intakeClub = await db.query.teams.findFirst({ where: eq(teams.intakeYear, completionYear) });
    if (intakeClub && intakeClub.id !== team.id) return fail(`Players from the ${completionYear} intake play for ${intakeClub.name}.`);
    if (!["GK", "DEF", "MID", "FWD"].includes(position)) return fail("Select your position.");
    if (number < 0 || number > 99) return fail("Choose a shirt number between 1 and 99, or leave it blank.");
    const clash = number ? await db.query.players.findFirst({ where: and(eq(players.teamId, team.id), eq(players.number, number)) }) : null;
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
        affiliation: "ALUMNI",
        completionYear,
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
      completionYear,
      passwordHash: await bcrypt.hash(password, 10),
      role: type as "ALUMNI_FAN" | "PLAYER",
      playerId,
      teamId,
    })
    .returning();
  await logActivity(u.id, "Created account", "User", `${name} (${completionYear} intake) registered as ${type === "PLAYER" ? "a player" : "an old student"}`, u.id);
  await startSession(u);
  redirect("/membership?welcome=1");
}

export async function signOutAction() {
  endSession();
  redirect("/");
}
