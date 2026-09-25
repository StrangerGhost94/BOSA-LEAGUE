"use server";

import bcrypt from "bcryptjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { guarded, Denied } from "@/lib/guard";
import { ok, fail, str, optStr, num, bool } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import { fromLocalInput, slugify } from "@/lib/format";
import { assignableRoles, can, manageableRoles } from "@/lib/roles";
import { getGroupTables } from "@/lib/data";
import { inBackground } from "@/lib/push";
import type { ActionResult } from "@/components/form";
import type { CurrentUser } from "@/lib/auth";

type A = Promise<ActionResult>;
const COLOR = /^#[0-9a-fA-F]{6}$/;

/* ============================== TEAMS ============================== */

export async function saveTeamAction(_: ActionResult, fd: FormData): A {
  return guarded("teams", async (u) => {
    const id = str(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) return fail("Team name is required.");
    const primaryColor = str(fd, "primaryColor") || "#1B2033";
    const secondaryColor = str(fd, "secondaryColor") || "#D6B676";
    if (!COLOR.test(primaryColor) || !COLOR.test(secondaryColor)) return fail("Colours must be hex values like #CC2654.");
    const intake = num(fd, "intakeYear");
    if (intake != null) {
      const clash = await db.query.teams.findFirst({ where: eq(s.teams.intakeYear, intake) });
      if (clash && clash.id !== id) return fail(`The ${intake} intake already has a club: ${clash.name}.`);
    }
    const values = {
      name,
      shortName: (str(fd, "shortName") || name.slice(0, 3)).toUpperCase().slice(0, 4),
      campus: str(fd, "campus"),
      intakeYear: num(fd, "intakeYear"),
      founded: num(fd, "founded") ?? new Date().getFullYear(),
      primaryColor,
      secondaryColor,
      motto: optStr(fd, "motto"),
      homeVenue: optStr(fd, "homeVenue"),
      coachName: optStr(fd, "coachName"),
      captainName: optStr(fd, "captainName"),
      bio: optStr(fd, "bio"),
      crest: str(fd, "crest") || "/crests/bosa-logo.png",
    };
    if (id) {
      await db.update(s.teams).set(values).where(eq(s.teams.id, id));
      await logActivity(u.id, "Updated team", "Team", name, id);
      return ok(`${name} saved.`);
    }
    const [t] = await db.insert(s.teams).values({ ...values, slug: slugify(name) }).returning();
    await logActivity(u.id, "Created team", "Team", name, t.id);
    return ok(`${name} registered.`);
  });
}

/* ============================== PLAYERS ============================== */

export async function savePlayerAction(_: ActionResult, fd: FormData): A {
  return guarded(
    (u) => can(u.role, "players") || u.role === "TEAM_MANAGER",
    async (u) => {
      const id = str(fd, "id");
      let teamId = str(fd, "teamId");
      if (u.role === "TEAM_MANAGER") {
        teamId = u.teamId ?? "";
        if (id) {
          const p = await db.query.players.findFirst({ where: eq(s.players.id, id) });
          if (!p || p.teamId !== u.teamId) throw new Denied("You can only manage your own squad.");
        }
      }
      const firstName = str(fd, "firstName");
      const lastName = str(fd, "lastName");
      const number = num(fd, "number");
      const position = (str(fd, "position") || null) as s.Position | null;
      if (!teamId || !firstName || !lastName) return fail("Club, first name and last name are required.");
      if (number == null || number < 0 || number > 99) return fail("Shirt number must be between 1 and 99 (or 0 if not yet known).");
      if (position && !["GK", "DEF", "MID", "FWD"].includes(position)) return fail("Choose a position.");
      const clash = await db.query.players.findFirst({ where: and(eq(s.players.teamId, teamId), eq(s.players.number, number)) });
      if (number > 0 && clash && clash.id !== id && clash.status !== "REJECTED") return fail(`Number ${number} is already worn by ${clash.firstName} ${clash.lastName}.`);
      const values = {
        teamId,
        firstName,
        lastName,
        number,
        position,
        affiliation: "ALUMNI" as const,
        completionYear: num(fd, "completionYear"),
        birthYear: num(fd, "birthYear"),
        bio: optStr(fd, "bio"),
        ...(can(u.role, "players") && fd.has("baseGoals")
          ? { baseGoals: num(fd, "baseGoals") ?? 0, baseAssists: num(fd, "baseAssists") ?? 0, baseApps: num(fd, "baseApps") ?? 0 }
          : {}),
      };
      if (id) {
        await db.update(s.players).set(values).where(eq(s.players.id, id));
        await logActivity(u.id, "Updated player", "Player", `${firstName} ${lastName}`, id);
        return ok("Player saved.");
      }
      // Team managers register players for approval; league admins can approve immediately
      const status = u.role === "TEAM_MANAGER" ? "PENDING" : bool(fd, "approve") ? "ACTIVE" : "PENDING";
      const [p] = await db.insert(s.players).values({ ...values, status }).returning();
      await logActivity(u.id, u.role === "TEAM_MANAGER" ? "Registered player (awaiting approval)" : "Registered player", "Player", `${firstName} ${lastName}`, p.id);
      return ok(status === "PENDING" ? "Player registered and sent for approval." : "Player registered and approved.");
    },
  );
}

export async function reviewPlayerAction(_: ActionResult, fd: FormData): A {
  return guarded("players", async (u) => {
    const id = str(fd, "id");
    const decision = str(fd, "decision");
    const status = decision === "approve" ? "ACTIVE" : "REJECTED";
    const [p] = await db.update(s.players).set({ status, statusNote: decision === "approve" ? null : optStr(fd, "note") }).where(eq(s.players.id, id)).returning();
    await logActivity(u.id, decision === "approve" ? "Approved player" : "Rejected player", "Player", `${p.firstName} ${p.lastName}`, id);
    return ok(decision === "approve" ? `${p.firstName} ${p.lastName} approved.` : `${p.firstName} ${p.lastName} rejected.`);
  });
}

export async function setPlayerStatusAction(_: ActionResult, fd: FormData): A {
  return guarded(
    (u) => can(u.role, "players") || u.role === "TEAM_MANAGER",
    async (u) => {
      const id = str(fd, "id");
      const status = str(fd, "status") as s.PlayerStatus;
      const p = await db.query.players.findFirst({ where: eq(s.players.id, id) });
      if (!p) return fail("Player not found.");
      if (u.role === "TEAM_MANAGER") {
        if (p.teamId !== u.teamId) throw new Denied("You can only manage your own squad.");
        if (!["ACTIVE", "INJURED", "INACTIVE"].includes(status)) throw new Denied("Only the League office can issue suspensions.");
        if (p.status === "SUSPENDED" || p.status === "PENDING") throw new Denied("This player's status is controlled by the League office.");
      }
      if (!["ACTIVE", "INJURED", "SUSPENDED", "INACTIVE"].includes(status)) return fail("Choose a valid status.");
      const until = str(fd, "until");
      await db
        .update(s.players)
        .set({ status, statusNote: status === "ACTIVE" ? null : optStr(fd, "note"), statusUntil: status === "ACTIVE" || !until ? null : new Date(`${until}T23:59:00+03:00`) })
        .where(eq(s.players.id, id));
      await logActivity(u.id, `Set player ${status.toLowerCase()}`, "Player", `${p.firstName} ${p.lastName}${optStr(fd, "note") ? `: ${optStr(fd, "note")}` : ""}`, id);
      return ok(`${p.firstName} ${p.lastName} marked ${status.toLowerCase()}.`);
    },
  );
}

export async function deletePlayerAction(_: ActionResult, fd: FormData): A {
  return guarded("players", async (u) => {
    const id = str(fd, "id");
    const [p] = await db.delete(s.players).where(eq(s.players.id, id)).returning();
    await logActivity(u.id, "Deleted player", "Player", p ? `${p.firstName} ${p.lastName}` : id);
    return ok("Player removed.");
  });
}

/* ============================== FIXTURES ============================== */

export async function createMatchAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const seasonId = str(fd, "seasonId");
    const home = optStr(fd, "homeTeamId");
    const away = optStr(fd, "awayTeamId");
    const kickoff = str(fd, "kickoff");
    if (!seasonId || !kickoff) return fail("Season and kick-off time are required.");
    if (home && home === away) return fail("A team cannot play itself.");
    const stage = (str(fd, "stage") || "LEAGUE") as s.Stage;
    const matchday = num(fd, "matchday");
    const round = str(fd, "round") || (stage === "LEAGUE" ? `Matchday ${matchday ?? 1}` : stage === "GROUP" ? `Group Stage · Round ${matchday ?? 1}` : stage.replace("_", "-").toLowerCase().replace(/^./, (c) => c.toUpperCase()));
    const [m] = await db
      .insert(s.matches)
      .values({
        seasonId,
        stage,
        round,
        matchday,
        groupId: optStr(fd, "groupId"),
        bracketSlot: num(fd, "bracketSlot"),
        homeTeamId: home,
        awayTeamId: away,
        kickoff: fromLocalInput(kickoff),
        venueId: optStr(fd, "venueId"),
        refereeId: optStr(fd, "refereeId"),
      })
      .returning();
    await logActivity(u.id, "Scheduled fixture", "Match", round, m.id);
    return ok("Fixture scheduled.");
  });
}

export async function updateScheduleAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const id = str(fd, "id");
    const m = await db.query.matches.findFirst({ where: eq(s.matches.id, id) });
    if (!m) return fail("Match not found.");
    const kickoff = str(fd, "kickoff");
    const newKick = kickoff ? fromLocalInput(kickoff) : m.kickoff;
    const home = optStr(fd, "homeTeamId");
    const away = optStr(fd, "awayTeamId");
    if (home && home === away) return fail("A team cannot play itself.");
    const moved = newKick.getTime() !== m.kickoff.getTime();
    let status = m.status;
    if (bool(fd, "postpone")) status = "POSTPONED";
    else if (m.status === "POSTPONED" && moved) status = "SCHEDULED";
    await db
      .update(s.matches)
      .set({
        kickoff: newKick,
        venueId: optStr(fd, "venueId"),
        refereeId: optStr(fd, "refereeId"),
        homeTeamId: home,
        awayTeamId: away,
        round: str(fd, "round") || m.round,
        matchday: num(fd, "matchday") ?? m.matchday,
        status,
        statusNote: optStr(fd, "statusNote"),
        publicFrom: str(fd, "publicFrom") ? fromLocalInput(str(fd, "publicFrom")) : null,
        updatedAt: new Date(),
      })
      .where(eq(s.matches.id, id));
    await logActivity(u.id, moved ? "Rescheduled match" : "Updated match details", "Match", m.round, id);
    if (status === "POSTPONED" && m.status !== "POSTPONED") inBackground("status", async () => (await import("@/lib/push")).notifyMatchStatus(id, "POSTPONED"));
    else if (moved && status === "SCHEDULED") inBackground("rescheduled", async () => (await import("@/lib/push")).notifyRescheduled(id));
    return ok(moved ? "Match rescheduled." : "Match details saved.");
  });
}

export async function deleteMatchAction(_: ActionResult, fd: FormData): A {
  const r = await guarded("fixtures", async (u) => {
    const id = str(fd, "id");
    const [m] = await db.delete(s.matches).where(eq(s.matches.id, id)).returning();
    await logActivity(u.id, "Deleted fixture", "Match", m?.round);
    return ok("Fixture deleted.");
  });
  if (r?.ok) redirect("/admin/fixtures");
  return r;
}

/** Double or single round-robin generator for a season's entered teams. */
export async function generateRoundRobinAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const seasonId = str(fd, "seasonId");
    const start = str(fd, "startDate");
    const interval = num(fd, "interval") ?? 7;
    const double = bool(fd, "double");
    const times = str(fd, "times").split(",").map((x) => x.trim()).filter((x) => /^\d{2}:\d{2}$/.test(x));
    if (!seasonId || !start) return fail("Choose a season and a start date.");
    const existing = await db.query.matches.findFirst({ where: eq(s.matches.seasonId, seasonId) });
    if (existing && !bool(fd, "replace")) return fail("This season already has fixtures. Tick 'replace existing' to regenerate unplayed fixtures.");
    if (existing) await pool.query("delete from matches where season_id=$1 and status in ('SCHEDULED','POSTPONED')", [seasonId]);
    const entries = await db.query.seasonTeams.findMany({ where: eq(s.seasonTeams.seasonId, seasonId) });
    const ids = entries.map((e) => e.teamId);
    if (ids.length < 2) return fail("Add at least two teams to the season first.");
    if (ids.length % 2) ids.push("BYE");
    const n = ids.length;
    const rounds: [string, string][][] = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs: [string, string][] = [[ids[n - 1], ids[r]]];
      for (let k = 1; k < n / 2; k++) pairs.push([ids[(r + k) % (n - 1)], ids[(r - k + n - 1) % (n - 1)]]);
      rounds.push(pairs.map(([a, b]) => (r % 2 ? [b, a] : [a, b])));
    }
    const all = double ? [...rounds, ...rounds.map((p) => p.map(([a, b]) => [b, a] as [string, string]))] : rounds;
    const venueId = optStr(fd, "venueId");
    const slots = times.length ? times : ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
    let created = 0;
    for (const [ri, pairs] of all.entries()) {
      const d = new Date(`${start}T12:00:00+03:00`);
      d.setUTCDate(d.getUTCDate() + ri * interval);
      const day = d.toISOString().slice(0, 10);
      let slot = 0;
      for (const [h, a] of pairs) {
        if (h === "BYE" || a === "BYE") continue;
        await db.insert(s.matches).values({
          seasonId,
          stage: "LEAGUE",
          round: `Matchday ${ri + 1}`,
          matchday: ri + 1,
          homeTeamId: h,
          awayTeamId: a,
          kickoff: new Date(`${day}T${slots[slot % slots.length]}:00+03:00`),
          venueId,
        });
        slot++;
        created++;
      }
    }
    await logActivity(u.id, "Generated fixtures", "Season", `${created} fixtures across ${all.length} matchdays`, seasonId);
    return ok(`${created} fixtures generated across ${all.length} matchdays.`);
  });
}

/* ============================== MATCH CONSOLE ============================== */

async function loadMatchForEdit(u: CurrentUser, matchId: string) {
  const m = await db.query.matches.findFirst({ where: eq(s.matches.id, matchId) });
  if (!m) throw new Denied("Match not found.");
  // Live reporters cover any match; a referee only the matches they are appointed to
  if (!(can(u.role, "results") || u.role === "LIVE_REPORTER" || (u.role === "REFEREE" && m.refereeId === u.id))) throw new Denied("Only administrators, live reporters or the appointed referee can update this match.");
  return m;
}
const canResults = (u: CurrentUser) => can(u.role, "results") || u.role === "REFEREE" || u.role === "LIVE_REPORTER";

export async function setMatchStatusAction(_: ActionResult, fd: FormData): A {
  return guarded(canResults, async (u) => {
    const m = await loadMatchForEdit(u, str(fd, "id"));
    const status = str(fd, "status") as s.MatchStatus;
    if (!["SCHEDULED", "LIVE", "HALF_TIME", "FULL_TIME", "POSTPONED", "CANCELLED"].includes(status)) return fail("Invalid status.");
    // Live reporters run the match itself; postponing or cancelling is for the League office
    if (u.role === "LIVE_REPORTER" && !["LIVE", "HALF_TIME", "FULL_TIME"].includes(status)) return fail("Only the League office can postpone or cancel a match.");
    const minute = num(fd, "minute");
    const patch: Partial<s.Match> = { status, updatedAt: new Date() };
    if (status === "LIVE") {
      patch.minute = minute ?? m.minute ?? 1;
      patch.clockAt = new Date();
      if (m.homeScore == null) patch.homeScore = 0;
      if (m.awayScore == null) patch.awayScore = 0;
    }
    if (status === "HALF_TIME") patch.minute = 45;
    if (status === "FULL_TIME") {
      patch.minute = 90;
      if (m.homeScore == null) patch.homeScore = 0;
      if (m.awayScore == null) patch.awayScore = 0;
    }
    if (status === "SCHEDULED") {
      patch.minute = null;
    }
    await db.update(s.matches).set(patch).where(eq(s.matches.id, m.id));
    if (status === "FULL_TIME") {
      const { advanceKnockout } = await import("@/lib/match-service");
      await advanceKnockout(m.id);
    }
    await logActivity(u.id, `Match status: ${status.replace("_", " ").toLowerCase()}`, "Match", m.round, m.id);
    // Push the result to members (once per person, even if full time is recorded twice)
    if (status === "FULL_TIME") inBackground("result", async () => (await import("@/lib/push")).notifyResult(m.id));
    // Kick-off (only when a match starts, not when the second half resumes), half-time, postponed, cancelled
    const kickOff = status === "LIVE" && m.status === "SCHEDULED";
    if ((kickOff || ["HALF_TIME", "POSTPONED", "CANCELLED"].includes(status)) && status !== m.status)
      inBackground("status", async () => (await import("@/lib/push")).notifyMatchStatus(m.id, status));
    return ok(status === "FULL_TIME" ? "Full-time recorded. Standings updated." : `Status set to ${status.replace("_", " ").toLowerCase()}.`);
  });
}

export async function setMinuteAction(_: ActionResult, fd: FormData): A {
  return guarded(canResults, async (u) => {
    const m = await loadMatchForEdit(u, str(fd, "id"));
    await db.update(s.matches).set({ minute: num(fd, "minute"), clockAt: new Date() }).where(eq(s.matches.id, m.id));
    return ok("Clock updated.");
  });
}

export async function setScoreAction(_: ActionResult, fd: FormData): A {
  return guarded(canResults, async (u) => {
    const m = await loadMatchForEdit(u, str(fd, "id"));
    const hs = num(fd, "homeScore");
    const as = num(fd, "awayScore");
    if (hs == null || as == null || hs < 0 || as < 0) return fail("Enter both scores.");
    const hp = num(fd, "homePens");
    const ap = num(fd, "awayPens");
    const finalise = bool(fd, "finalise");
    await db
      .update(s.matches)
      .set({ homeScore: hs, awayScore: as, homePens: hp, awayPens: ap, status: finalise ? "FULL_TIME" : m.status === "SCHEDULED" ? "LIVE" : m.status, minute: finalise ? 90 : m.minute, updatedAt: new Date() })
      .where(eq(s.matches.id, m.id));
    if (finalise) {
      const { advanceKnockout } = await import("@/lib/match-service");
      await advanceKnockout(m.id);
    }
    if (finalise) inBackground("result", async () => (await import("@/lib/push")).notifyResult(m.id));
    await logActivity(u.id, finalise ? "Recorded result" : "Updated score", "Match", `${m.round}: ${hs}-${as}${hp != null ? ` (pens ${hp}-${ap})` : ""}`, m.id);
    return ok(finalise ? `Result recorded: ${hs}-${as}. Points updated.` : `Score updated to ${hs}-${as}.`);
  });
}

export async function addEventAction(_: ActionResult, fd: FormData): A {
  return guarded(canResults, async (u) => {
    const m = await loadMatchForEdit(u, str(fd, "id"));
    const type = str(fd, "type") as s.EventType;
    const teamId = str(fd, "teamId");
    const minute = num(fd, "minute");
    if (![m.homeTeamId, m.awayTeamId].includes(teamId)) return fail("Choose one of the two teams.");
    if (minute == null || minute < 0 || minute > 130) return fail("Enter a valid minute.");
    const playerId = optStr(fd, "playerId");
    // Goals and cards can be logged before the player is known (clubs without a squad list, or a quick tap mid-match)
    if (["SUB", "PENALTY_MISS"].includes(type) && !playerId) return fail("Choose the player.");
    const [e] = await db
      .insert(s.matchEvents)
      .values({ matchId: m.id, type, teamId, minute, playerId, assistId: optStr(fd, "assistId"), playerOffId: optStr(fd, "playerOffId"), note: optStr(fd, "note") })
      .returning();
    const { recalcScore, applyDiscipline } = await import("@/lib/match-service");
    if (["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(type)) await recalcScore(m.id);
    if (type === "SUB" && playerId) {
      await db.insert(s.lineups).values({ matchId: m.id, playerId, teamId, starter: false }).onConflictDoNothing();
    }
    let extra = "";
    if (["YELLOW", "SECOND_YELLOW", "RED"].includes(type)) {
      const reason = await applyDiscipline(e.id);
      if (reason) extra = ` Suspension applied: ${reason}.`;
    }
    if (m.status === "SCHEDULED") await db.update(s.matches).set({ status: "LIVE", minute, clockAt: new Date(), homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0 }).where(eq(s.matches.id, m.id));
    if (["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(type) && m.status === "SCHEDULED") await recalcScore(m.id);
    await logActivity(u.id, `Added ${type.replace("_", " ").toLowerCase()}`, "Match", `${m.round} ${minute}'`, m.id);
    // Recording the first event starts the match: that's the kick-off alert
    if (m.status === "SCHEDULED") inBackground("status", async () => (await import("@/lib/push")).notifyMatchStatus(m.id, "LIVE"));
    if (["RED", "SECOND_YELLOW"].includes(type) && m.status !== "FULL_TIME") inBackground("red card", async () => (await import("@/lib/push")).notifyRedCard(e.id));
    // Goal alert while the match is on (goals added after full time are corrections, not news)
    if (["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(type) && m.status !== "FULL_TIME") inBackground("goal", async () => (await import("@/lib/push")).notifyGoal(e.id));
    return ok(`Event added.${extra}`);
  });
}

export async function deleteEventAction(_: ActionResult, fd: FormData): A {
  return guarded(canResults, async (u) => {
    const e = await db.query.matchEvents.findFirst({ where: eq(s.matchEvents.id, str(fd, "eventId")) });
    if (!e) return fail("Event not found.");
    const m = await loadMatchForEdit(u, e.matchId);
    await db.delete(s.matchEvents).where(eq(s.matchEvents.id, e.id));
    if (["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(e.type)) {
      const { recalcScore } = await import("@/lib/match-service");
      await recalcScore(m.id);
    }
    await logActivity(u.id, "Removed match event", "Match", `${e.type} ${e.minute}'`, m.id);
    return ok("Event removed.");
  });
}

export async function saveLineupAction(_: ActionResult, fd: FormData): A {
  return guarded(
    (u) => canResults(u) || u.role === "TEAM_MANAGER",
    async (u) => {
      const matchId = str(fd, "id");
      const teamId = str(fd, "teamId");
      const m = await db.query.matches.findFirst({ where: eq(s.matches.id, matchId) });
      if (!m || ![m.homeTeamId, m.awayTeamId].includes(teamId)) return fail("Match or team not found.");
      if (u.role === "TEAM_MANAGER") {
        if (u.teamId !== teamId) throw new Denied("You can only submit your own team sheet.");
        if (m.status === "FULL_TIME") throw new Denied("Team sheets are locked after full-time.");
      } else if (!can(u.role, "results") && m.refereeId !== u.id) throw new Denied("Not your match.");
      const starters = fd.getAll("starter").map(String);
      const subs = fd.getAll("sub").map(String).filter((x) => !starters.includes(x));
      if (starters.length > 11) return fail("A maximum of eleven starters.");
      const squad = await db.query.players.findMany({ where: and(eq(s.players.teamId, teamId), inArray(s.players.id, [...starters, ...subs].length ? [...starters, ...subs] : ["-"])) });
      const bad = squad.filter((p) => p.status === "SUSPENDED" || p.status === "PENDING" || p.status === "REJECTED");
      if (bad.length) return fail(`${bad.map((p) => `${p.firstName} ${p.lastName}`).join(", ")} ${bad.length > 1 ? "are" : "is"} not eligible.`);
      await pool.query("delete from lineups where match_id=$1 and team_id=$2", [matchId, teamId]);
      const rows = [...starters.map((p) => ({ matchId, playerId: p, teamId, starter: true })), ...subs.map((p) => ({ matchId, playerId: p, teamId, starter: false }))];
      if (rows.length) await db.insert(s.lineups).values(rows);
      await logActivity(u.id, "Submitted team sheet", "Match", `${starters.length} starters, ${subs.length} substitutes`, matchId);
      return ok(`Team sheet saved: ${starters.length} starters, ${subs.length} substitutes.`);
    },
  );
}

export async function saveMatchReportAction(_: ActionResult, fd: FormData): A {
  return guarded(canResults, async (u) => {
    const m = await loadMatchForEdit(u, str(fd, "id"));
    await db
      .update(s.matches)
      .set({ report: optStr(fd, "report"), potmId: optStr(fd, "potmId"), attendance: num(fd, "attendance"), updatedAt: new Date() })
      .where(eq(s.matches.id, m.id));
    await logActivity(u.id, "Saved match report", "Match", m.round, m.id);
    return ok("Match report saved.");
  });
}

/* ============================== COMPETITIONS & SEASONS ============================== */

export async function createCompetitionAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const name = str(fd, "name");
    if (!name) return fail("Name is required.");
    const type = str(fd, "type") as "LEAGUE" | "CHAMPIONS" | "SUPER";
    const [c] = await db
      .insert(s.competitions)
      .values({ name, slug: slugify(name), shortName: str(fd, "shortName") || name, type: ["LEAGUE", "CHAMPIONS", "SUPER"].includes(type) ? type : "LEAGUE", tagline: optStr(fd, "tagline"), description: optStr(fd, "description"), order: 10 })
      .returning();
    await logActivity(u.id, "Created competition", "Competition", name, c.id);
    return ok(`${name} created.`);
  });
}

export async function createSeasonAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const competitionId = str(fd, "competitionId");
    const name = str(fd, "name");
    const year = num(fd, "year");
    if (!competitionId || !name || !year) return fail("Competition, name and year are required.");
    const makeCurrent = bool(fd, "isCurrent");
    if (makeCurrent) await db.update(s.seasons).set({ isCurrent: false }).where(eq(s.seasons.competitionId, competitionId));
    const [season] = await db
      .insert(s.seasons)
      .values({ competitionId, name, year, isCurrent: makeCurrent, pointsWin: num(fd, "pointsWin") ?? 3, pointsDraw: num(fd, "pointsDraw") ?? 1 })
      .returning();
    if (bool(fd, "allTeams")) {
      const ts = await db.select({ id: s.teams.id }).from(s.teams);
      await db.insert(s.seasonTeams).values(ts.map((t) => ({ seasonId: season.id, teamId: t.id })));
    }
    await logActivity(u.id, "Created season", "Season", name, season.id);
    return ok(`${name} created.`);
  });
}

export async function updateSeasonAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const id = str(fd, "id");
    const season = await db.query.seasons.findFirst({ where: eq(s.seasons.id, id) });
    if (!season) return fail("Season not found.");
    if (bool(fd, "isCurrent") && !season.isCurrent) await db.update(s.seasons).set({ isCurrent: false }).where(eq(s.seasons.competitionId, season.competitionId));
    await db
      .update(s.seasons)
      .set({
        name: str(fd, "name") || season.name,
        isCurrent: bool(fd, "isCurrent"),
        pointsWin: num(fd, "pointsWin") ?? season.pointsWin,
        pointsDraw: num(fd, "pointsDraw") ?? season.pointsDraw,
        registrationOpen: bool(fd, "registrationOpen"),
        registrationNote: optStr(fd, "registrationNote"),
        championId: optStr(fd, "championId"),
      })
      .where(eq(s.seasons.id, id));
    await logActivity(u.id, "Updated season", "Season", season.name, id);
    return ok("Season saved.");
  });
}

export async function setSeasonTeamsAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const seasonId = str(fd, "seasonId");
    const teamIds = fd.getAll("teamId").map(String);
    const existing = await db.query.seasonTeams.findMany({ where: eq(s.seasonTeams.seasonId, seasonId) });
    const prev = Object.fromEntries(existing.map((e) => [e.teamId, e]));
    const val = (teamId: string, key: string, fallback: number) => num(fd, `${key}_${teamId}`) ?? fallback;
    await pool.query("delete from season_teams where season_id=$1", [seasonId]);
    if (teamIds.length)
      await db.insert(s.seasonTeams).values(
        teamIds.map((teamId) => {
          const e = prev[teamId];
          const form = fd.has(`form_${teamId}`) ? str(fd, `form_${teamId}`).toUpperCase().replace(/[^WDL]/g, "").slice(-5) : e?.baseForm ?? "";
          return {
            seasonId,
            teamId,
            pointsAdjustment: val(teamId, "adj", e?.pointsAdjustment ?? 0),
            basePlayed: val(teamId, "bp", e?.basePlayed ?? 0),
            baseWon: val(teamId, "bw", e?.baseWon ?? 0),
            baseDrawn: val(teamId, "bd", e?.baseDrawn ?? 0),
            baseLost: val(teamId, "bl", e?.baseLost ?? 0),
            baseGoalsFor: val(teamId, "bf", e?.baseGoalsFor ?? 0),
            baseGoalsAgainst: val(teamId, "ba", e?.baseGoalsAgainst ?? 0),
            baseForm: form,
          };
        }),
      );
    await logActivity(u.id, "Updated season entries", "Season", `${teamIds.length} teams`, seasonId);
    return ok(`${teamIds.length} teams saved. The table has been recalculated.`);
  });
}

export async function saveGroupAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const seasonId = str(fd, "seasonId");
    const groupId = str(fd, "groupId");
    const name = str(fd, "name");
    const teamIds = fd.getAll("teamId").map(String);
    let gid = groupId;
    if (!gid) {
      if (!name) return fail("Group name is required.");
      const count = await db.query.groups.findMany({ where: eq(s.groups.seasonId, seasonId) });
      const [g] = await db.insert(s.groups).values({ seasonId, name, order: count.length }).returning();
      gid = g.id;
    } else if (name) await db.update(s.groups).set({ name }).where(eq(s.groups.id, gid));
    await pool.query("delete from group_teams where group_id=$1", [gid]);
    if (teamIds.length) await db.insert(s.groupTeams).values(teamIds.map((teamId) => ({ groupId: gid, teamId })));
    await logActivity(u.id, groupId ? "Updated group" : "Created group", "Group", name || gid, gid);
    return ok("Group saved.");
  });
}

export async function deleteGroupAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    await db.delete(s.groups).where(eq(s.groups.id, str(fd, "groupId")));
    await logActivity(u.id, "Deleted group", "Group");
    return ok("Group deleted.");
  });
}

export async function generateGroupFixturesAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const seasonId = str(fd, "seasonId");
    const start = str(fd, "startDate");
    const time = str(fd, "time") || "17:00";
    if (!start) return fail("Choose a start date.");
    const groups = await db.query.groups.findMany({ where: eq(s.groups.seasonId, seasonId), with: { teams: true, matches: true } });
    let created = 0;
    for (const g of groups) {
      if (g.matches.length) continue;
      const ids = g.teams.map((t) => t.teamId);
      let round = 0;
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const d = new Date(`${start}T12:00:00+03:00`);
          d.setUTCDate(d.getUTCDate() + round * 7);
          await db.insert(s.matches).values({
            seasonId,
            groupId: g.id,
            stage: "GROUP",
            round: `Group Stage · Round ${round + 1}`,
            matchday: round + 1,
            homeTeamId: ids[i],
            awayTeamId: ids[j],
            kickoff: new Date(`${d.toISOString().slice(0, 10)}T${time}:00+03:00`),
            venueId: optStr(fd, "venueId"),
          });
          created++;
          round = (round + 1) % Math.max(1, ids.length - 1);
        }
    }
    await logActivity(u.id, "Generated group fixtures", "Season", `${created} matches`, seasonId);
    return ok(created ? `${created} group fixtures created.` : "Every group already has fixtures.");
  });
}

/** Creates quarter-finals from the group tables (A1 v B2, C1 v D2, B1 v A2, D1 v C2) plus empty semi-final and final slots. */
export async function generateKnockoutAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const seasonId = str(fd, "seasonId");
    const date = str(fd, "startDate");
    if (!date) return fail("Choose the quarter-final date.");
    const existing = await db.query.matches.findFirst({ where: and(eq(s.matches.seasonId, seasonId), eq(s.matches.stage, "QUARTER_FINAL")) });
    if (existing) return fail("Knockout rounds already exist for this season.");
    const tables = await getGroupTables(seasonId);
    if (tables.length !== 4) return fail("The automatic draw needs exactly four groups.");
    const [A, B, C, D] = tables.map((t) => t.rows.map((r) => r.teamId));
    const pairs: [string, string][] = [[A[0], B[1]], [C[0], D[1]], [B[0], A[1]], [D[0], C[1]]];
    const venueId = optStr(fd, "venueId");
    const at = (d: number, t: string) => {
      const x = new Date(`${date}T12:00:00+03:00`);
      x.setUTCDate(x.getUTCDate() + d);
      return new Date(`${x.toISOString().slice(0, 10)}T${t}:00+03:00`);
    };
    for (const [i, [h, a]] of pairs.entries())
      await db.insert(s.matches).values({ seasonId, stage: "QUARTER_FINAL", round: "Quarter-final", bracketSlot: i + 1, homeTeamId: h, awayTeamId: a, kickoff: at(i < 2 ? 0 : 1, i % 2 ? "19:00" : "17:30"), venueId });
    for (const i of [1, 2]) await db.insert(s.matches).values({ seasonId, stage: "SEMI_FINAL", round: "Semi-final", bracketSlot: i, kickoff: at(14, i === 1 ? "17:30" : "19:15"), venueId });
    await db.insert(s.matches).values({ seasonId, stage: "FINAL", round: "Final", bracketSlot: 1, kickoff: at(28, "18:00"), venueId });
    await logActivity(u.id, "Drew knockout rounds", "Season", "Quarter-finals, semi-finals and final created", seasonId);
    return ok("Knockout bracket created. Winners advance automatically.");
  });
}

/* ============================== NEWS ============================== */

export async function saveArticleAction(_: ActionResult, fd: FormData): A {
  const r = await guarded("news", async (u) => {
    const id = str(fd, "id");
    const title = str(fd, "title");
    const body = str(fd, "body");
    if (title.length < 5) return fail("Give the story a headline.");
    if (body.length < 20) return fail("The story body is too short.");
    const excerpt = str(fd, "excerpt") || body.slice(0, 180);
    const values = {
      title,
      excerpt,
      body,
      category: (str(fd, "category") || "ANNOUNCEMENT") as s.ArticleCategory,
      featured: bool(fd, "featured"),
      published: bool(fd, "published"),
      membersOnly: bool(fd, "membersOnly"),
      competitionId: optStr(fd, "competitionId"),
      teamId: optStr(fd, "teamId"),
      authorName: str(fd, "authorName") || u.name,
      publicFrom: str(fd, "publicFrom") ? fromLocalInput(str(fd, "publicFrom")) : null,
      readMinutes: Math.max(1, Math.round(body.split(/\s+/).length / 200)),
    };
    if (id) {
      await db.update(s.articles).set(values).where(eq(s.articles.id, id));
      await logActivity(u.id, values.published ? "Updated article" : "Saved draft", "Article", title, id);
      return ok("Story saved.");
    }
    let slug = slugify(title);
    if (await db.query.articles.findFirst({ where: eq(s.articles.slug, slug) })) slug = `${slug}-${Date.now().toString(36)}`;
    const [a] = await db.insert(s.articles).values({ ...values, slug, authorId: u.id, publishedAt: new Date() }).returning();
    await logActivity(u.id, values.published ? "Published article" : "Created draft", "Article", title, a.id);
    return ok(values.published ? "Story published." : "Draft saved.");
  });
  if (r?.ok && !str(fd, "id")) redirect("/admin/news");
  return r;
}

export async function deleteArticleAction(_: ActionResult, fd: FormData): A {
  return guarded("news", async (u) => {
    const [a] = await db.delete(s.articles).where(eq(s.articles.id, str(fd, "id"))).returning();
    await logActivity(u.id, "Deleted article", "Article", a?.title);
    return ok("Story deleted.");
  });
}

export async function togglePublishAction(_: ActionResult, fd: FormData): A {
  return guarded("news", async (u) => {
    const a = await db.query.articles.findFirst({ where: eq(s.articles.id, str(fd, "id")) });
    if (!a) return fail("Story not found.");
    await db.update(s.articles).set({ published: !a.published, publishedAt: !a.published ? new Date() : a.publishedAt }).where(eq(s.articles.id, a.id));
    await logActivity(u.id, a.published ? "Unpublished article" : "Published article", "Article", a.title, a.id);
    return ok(a.published ? "Story moved to drafts." : "Story published.");
  });
}

/* ============================== RULES ============================== */

export async function saveRuleAction(_: ActionResult, fd: FormData): A {
  return guarded("rules", async (u) => {
    const id = str(fd, "id");
    const title = str(fd, "title");
    const body = str(fd, "body");
    if (!title || !body) return fail("Title and text are required.");
    const values = { title, body, competitionId: optStr(fd, "competitionId"), order: num(fd, "order") ?? 0 };
    if (id) await db.update(s.rules).set(values).where(eq(s.rules.id, id));
    else await db.insert(s.rules).values(values);
    await logActivity(u.id, id ? "Updated rule" : "Added rule", "Rule", title);
    return ok("Rule saved.");
  });
}

export async function deleteRuleAction(_: ActionResult, fd: FormData): A {
  return guarded("rules", async (u) => {
    const [r] = await db.delete(s.rules).where(eq(s.rules.id, str(fd, "id"))).returning();
    await logActivity(u.id, "Deleted rule", "Rule", r?.title);
    return ok("Rule deleted.");
  });
}

/* ============================== USERS ============================== */

export async function updateUserAction(_: ActionResult, fd: FormData): A {
  return guarded("users", async (u) => {
    const id = str(fd, "id");
    const target = await db.query.users.findFirst({ where: eq(s.users.id, id) });
    if (!target) return fail("User not found.");
    const role = str(fd, "role") as s.Role;
    // A League Administrator only looks after coaches, referees and live reporters; everyone else is the Super Admin's
    if (!manageableRoles(u.role).includes(target.role)) throw new Denied("Only the Super Admin can manage this account.");
    if (target.role === "SUPER_ADMIN" && u.role !== "SUPER_ADMIN") throw new Denied("Only a Super Admin can change another Super Admin.");
    if (role !== target.role && !assignableRoles(u.role).includes(role)) throw new Denied("You cannot assign that role.");
    if (target.id === u.id && role !== u.role) return fail("You cannot change your own role.");
    // Only the Super Admin can switch a membership on or off; for anyone else it stays as it is
    const membership = can(u.role, "payments") ? (str(fd, "membership") as "NONE" | "ACTIVE") : target.membership === "ACTIVE" ? "ACTIVE" : "NONE";
    await db
      .update(s.users)
      .set({
        role,
        teamId: optStr(fd, "teamId"),
        active: target.id === u.id ? true : bool(fd, "active"),
        membership: membership === "ACTIVE" ? "ACTIVE" : "NONE",
        membershipPaidAt: membership === "ACTIVE" && target.membership !== "ACTIVE" ? new Date() : target.membershipPaidAt,
      })
      .where(eq(s.users.id, id));
    if (membership === "ACTIVE") {
      const { ensureMemberNumber } = await import("@/lib/members");
      await ensureMemberNumber(id);
    }
    if (membership === "ACTIVE" && target.membership !== "ACTIVE")
      await db.insert(s.payments).values({ userId: id, amount: 0, merchantRef: `MANUAL-${Date.now().toString(36)}`, status: "COMPLETED", provider: "MANUAL", method: `Approved by ${u.name}` });
    await logActivity(u.id, "Updated user", "User", `${target.name}: ${role}${membership === "ACTIVE" ? ", member" : ""}`, id);
    return ok(`${target.name} updated.`);
  });
}

export async function createUserAction(_: ActionResult, fd: FormData): A {
  return guarded("users", async (u) => {
    const email = str(fd, "email").toLowerCase();
    const name = str(fd, "name");
    const password = str(fd, "password");
    const role = str(fd, "role") as s.Role;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a name and a valid email.");
    if (password.length < 8) return fail("Temporary password must be at least 8 characters.");
    if (!assignableRoles(u.role).includes(role)) throw new Denied("You cannot create that role.");
    if (await db.query.users.findFirst({ where: eq(s.users.email, email) })) return fail("A user with that email already exists.");
    const [n] = await db
      .insert(s.users)
      .values({ name, email, role, passwordHash: await bcrypt.hash(password, 10), teamId: optStr(fd, "teamId"), membership: ["STUDENT_FAN", "ALUMNI_FAN", "PLAYER"].includes(role) ? "NONE" : "ACTIVE" })
      .returning();
    await logActivity(u.id, "Created user", "User", `${name} (${role})`, n.id);
    return ok(`${name} can now sign in with the temporary password.`);
  });
}

/* ============================== APPLICATIONS / SETTINGS / VENUES ============================== */

export async function reviewApplicationAction(_: ActionResult, fd: FormData): A {
  return guarded("competitions", async (u) => {
    const status = str(fd, "status");
    const [a] = await db.update(s.teamApplications).set({ status }).where(eq(s.teamApplications.id, str(fd, "id"))).returning();
    await logActivity(u.id, `Application ${status.toLowerCase()}`, "TeamApplication", a?.teamName);
    return ok(`${a?.teamName} marked ${status.toLowerCase()}.`);
  });
}

export async function saveSettingsAction(_: ActionResult, fd: FormData): A {
  return guarded("settings", async (u) => {
    const price = num(fd, "membership_price");
    if (!price || price < 500) return fail("Enter a valid membership price.");
    await db.insert(s.settings).values({ key: "membership_price", value: String(Math.round(price)) }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(Math.round(price)) } });
    await logActivity(u.id, "Changed membership price", "Setting", `UGX ${price}`);
    return ok("Settings saved.");
  });
}

export async function saveVenueAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const id = str(fd, "id");
    const name = str(fd, "name");
    if (!name) return fail("Venue name is required.");
    const values = { name, area: str(fd, "area") || "Kampala", address: optStr(fd, "address"), capacity: num(fd, "capacity") };
    if (id) await db.update(s.venues).set(values).where(eq(s.venues.id, id));
    else await db.insert(s.venues).values(values);
    await logActivity(u.id, id ? "Updated venue" : "Added venue", "Venue", name);
    return ok("Venue saved.");
  });
}

/* ============================== TEAM MANAGER ============================== */

export async function updateOwnTeamAction(_: ActionResult, fd: FormData): A {
  return guarded(
    (u) => u.role === "TEAM_MANAGER" && !!u.teamId,
    async (u) => {
      const primaryColor = str(fd, "primaryColor");
      const secondaryColor = str(fd, "secondaryColor");
      if (!COLOR.test(primaryColor) || !COLOR.test(secondaryColor)) return fail("Colours must be hex values like #CC2654.");
      await db
        .update(s.teams)
        .set({ motto: optStr(fd, "motto"), bio: optStr(fd, "bio"), coachName: optStr(fd, "coachName"), captainName: optStr(fd, "captainName"), primaryColor, secondaryColor })
        .where(eq(s.teams.id, u.teamId!));
      await logActivity(u.id, "Updated club profile", "Team", u.team?.name, u.teamId!);
      return ok("Club profile saved.");
    },
  );
}

/* ============================== SUPER LEAGUE ============================== */

/** Schedules the single season-opening Super Cup match. Its winner automatically becomes the season's champion. */
export async function scheduleSuperMatchAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const seasonId = str(fd, "seasonId");
    const home = str(fd, "homeTeamId");
    const away = str(fd, "awayTeamId");
    const kickoff = str(fd, "kickoff");
    if (!seasonId || !home || !away || !kickoff) return fail("Choose both clubs and the kick-off time.");
    if (home === away) return fail("Choose two different clubs.");
    const existing = await db.query.matches.findFirst({ where: and(eq(s.matches.seasonId, seasonId), eq(s.matches.stage, "FINAL")) });
    const values = {
      homeTeamId: home,
      awayTeamId: away,
      kickoff: fromLocalInput(kickoff),
      venueId: optStr(fd, "venueId"),
      refereeId: optStr(fd, "refereeId"),
    };
    if (existing) {
      await db.update(s.matches).set({ ...values, updatedAt: new Date() }).where(eq(s.matches.id, existing.id));
      await logActivity(u.id, "Updated Super Cup match", "Match", undefined, existing.id);
      return ok("Super Cup match updated.");
    }
    const [m] = await db.insert(s.matches).values({ ...values, seasonId, stage: "FINAL", round: "Super Cup", bracketSlot: 1 }).returning();
    await logActivity(u.id, "Scheduled Super Cup match", "Match", undefined, m.id);
    return ok("Super Cup match scheduled.");
  });
}


/* ============================== EARLY ACCESS ============================== */

/** Members see a whole round of fixtures first; everyone else from the chosen time. Empty time = public now. */
export async function releaseRoundAction(_: ActionResult, fd: FormData): A {
  return guarded("fixtures", async (u) => {
    const seasonId = str(fd, "seasonId");
    const round = str(fd, "round");
    const when = str(fd, "publicFrom");
    const publicFrom = when ? fromLocalInput(when) : null;
    await db.update(s.matches).set({ publicFrom }).where(and(eq(s.matches.seasonId, seasonId), eq(s.matches.round, round)));
    await logActivity(u.id, publicFrom ? "Set members-first release" : "Made fixtures public", "Season", `${round}${publicFrom ? ` public from ${when.replace("T", " ")}` : ""}`, seasonId);
    return ok(publicFrom ? `${round}: members see it now, everyone else from ${when.replace("T", " ")}.` : `${round} is now public.`);
  });
}

/* ============================== MEMBER PERKS ============================== */

export async function savePerkAction(_: ActionResult, fd: FormData): A {
  return guarded("perks", async (u) => {
    const id = str(fd, "id");
    const sponsor = str(fd, "sponsor");
    const offer = str(fd, "offer");
    if (!sponsor || !offer) return fail("Sponsor and offer are required.");
    const values = { sponsor, offer, details: optStr(fd, "details"), active: bool(fd, "active"), order: num(fd, "order") ?? 0 };
    if (id) await db.update(s.perks).set(values).where(eq(s.perks.id, id));
    else await db.insert(s.perks).values(values);
    await logActivity(u.id, id ? "Updated member perk" : "Added member perk", "Perk", `${sponsor}: ${offer}`);
    return ok("Member perk saved.");
  });
}

export async function deletePerkAction(_: ActionResult, fd: FormData): A {
  return guarded("perks", async (u) => {
    const [p] = await db.delete(s.perks).where(eq(s.perks.id, str(fd, "id"))).returning();
    await logActivity(u.id, "Deleted member perk", "Perk", p?.sponsor);
    return ok("Perk removed.");
  });
}

/* ============================== VOUCHERS ============================== */

export async function generateVouchersAction(_: ActionResult, fd: FormData): A {
  return guarded("payments", async (u) => {
    const count = num(fd, "count") ?? 0;
    if (count < 1 || count > 5000) return fail("Generate between 1 and 5,000 vouchers at a time.");
    const batch = str(fd, "batch") || `Batch ${new Date().toISOString().slice(0, 10)}`;
    const { generateVouchers } = await import("@/lib/vouchers");
    const codes = await generateVouchers(count, batch);
    await logActivity(u.id, "Generated vouchers", "Voucher", `${codes.length} in "${batch}"`);
    return ok(`${codes.length} vouchers created in "${batch}". Download or print them below.`);
  });
}

export async function voidVoucherAction(_: ActionResult, fd: FormData): A {
  return guarded("payments", async (u) => {
    const { normaliseCode } = await import("@/lib/vouchers");
    const code = normaliseCode(str(fd, "code"));
    if (!code) return fail("Enter a voucher code.");
    const { rows } = await pool.query("update vouchers set status='VOID', note=$2 where code=$1 and status='UNUSED' returning code", [code, optStr(fd, "note")]);
    if (!rows.length) {
      const r = await pool.query("select status from vouchers where code=$1", [code]);
      return fail(r.rows[0] ? `That voucher is already ${String(r.rows[0].status).toLowerCase()}.` : "No voucher with that code.");
    }
    await logActivity(u.id, "Cancelled voucher", "Voucher", code);
    return ok(`${code} cancelled. It can no longer be used.`);
  });
}

export async function markVouchersIssuedAction(_: ActionResult, fd: FormData): A {
  return guarded("payments", async (u) => {
    const batch = str(fd, "batch");
    const note = str(fd, "note");
    if (!batch || !note) return fail("Choose a batch and say who it was given to.");
    const { rowCount } = await pool.query("update vouchers set note=$2 where batch=$1 and status='UNUSED'", [batch, note]);
    await logActivity(u.id, "Noted voucher batch", "Voucher", `${batch}: ${note}`);
    return ok(`Noted on ${rowCount} unused vouchers in "${batch}".`);
  });
}

/* ============================== ACCOUNT SHARING ============================== */

/** Ends every session of a member: all phones are signed out and must sign in again. */
export async function signOutEverywhereAction(_: ActionResult, fd: FormData): A {
  return guarded("sharing", async (u) => {
    const id = str(fd, "userId");
    const [t] = await db.update(s.users).set({ sessionVersion: sql`${s.users.sessionVersion} + 1` }).where(eq(s.users.id, id)).returning({ name: s.users.name });
    if (!t) return fail("Account not found.");
    await logActivity(u.id, "Signed out all devices", "User", t.name, id);
    return ok(`${t.name} has been signed out on every device.`);
  });
}

/** Suspends (or restores) a member account. Suspending also signs it out everywhere. */
export async function setAccountSuspendedAction(_: ActionResult, fd: FormData): A {
  return guarded("sharing", async (u) => {
    const id = str(fd, "userId");
    const suspend = str(fd, "suspend") === "1";
    if (id === u.id) return fail("You cannot suspend your own account.");
    const [t] = await db
      .update(s.users)
      .set(suspend ? { active: false, sessionVersion: sql`${s.users.sessionVersion} + 1` } : { active: true })
      .where(eq(s.users.id, id))
      .returning({ name: s.users.name });
    if (!t) return fail("Account not found.");
    await logActivity(u.id, suspend ? "Suspended account (sharing)" : "Restored account", "User", t.name, id);
    return ok(suspend ? `${t.name} is suspended and signed out.` : `${t.name} can sign in again.`);
  });
}
