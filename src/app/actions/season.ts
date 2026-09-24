"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { guarded } from "@/lib/guard";
import { ok, fail, str } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import { announceSeason, reinstateTeam, runSeasonEngine, withdrawTeam } from "@/lib/season-engine";
import type { ActionResult } from "@/components/form";

type A = Promise<ActionResult>;

export async function announceSeasonAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const day = str(fd, "openingDay");
    const time = str(fd, "superCupTime") || "15:00";
    const r = await announceSeason(day, time);
    await logActivity(u.id, "Announced new season", "Season", `${r.name}: opens ${day}, ${r.clubs} clubs, ${r.rounds} matchdays`);
    return ok(`${r.name} announced: ${r.clubs} clubs, ${r.rounds} matchdays. The Super Cup opens the season and Matchday 1 is on ${r.md1}.`);
  });
}

export async function withdrawTeamAction(_: ActionResult, fd: FormData): A {
  return guarded("teams", async (u) => {
    const id = str(fd, "teamId");
    const team = await db.query.teams.findFirst({ where: eq(s.teams.id, id) });
    if (!team) return fail("Club not found.");
    if (!team.active) return fail(`${team.name} has already withdrawn.`);
    const notes = await withdrawTeam(id);
    await logActivity(u.id, "Club withdrew", "Team", team.name, id);
    return ok(`${team.name} withdrawn. ${notes.join(" ")}`);
  });
}

export async function reinstateTeamAction(_: ActionResult, fd: FormData): A {
  return guarded("teams", async (u) => {
    const id = str(fd, "teamId");
    const team = await db.query.teams.findFirst({ where: eq(s.teams.id, id) });
    if (!team) return fail("Club not found.");
    const msg = await reinstateTeam(id);
    await logActivity(u.id, "Club reinstated", "Team", team.name, id);
    return ok(`${team.name}: ${msg}`);
  });
}

export async function runEngineAction(_: ActionResult): A {
  return guarded("competitions", async () => {
    const log = await runSeasonEngine();
    return ok(log.length ? log.join(" ") : "Everything is up to date. Nothing needed scheduling.");
  });
}
