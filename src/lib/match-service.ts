import "server-only";
import { and, eq, gt, or, asc, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";

const GOAL_TYPES = ["GOAL", "PENALTY_GOAL", "OWN_GOAL"] as const;

/** Recompute a match score from its goal events (own goals count for the event's team). */
export async function recalcScore(matchId: string) {
  const m = await db.query.matches.findFirst({ where: eq(s.matches.id, matchId), with: { events: true } });
  if (!m) return;
  let h = 0;
  let a = 0;
  for (const e of m.events) {
    if (!(GOAL_TYPES as readonly string[]).includes(e.type)) continue;
    if (e.teamId === m.homeTeamId) h++;
    else if (e.teamId === m.awayTeamId) a++;
  }
  await db.update(s.matches).set({ homeScore: h, awayScore: a, updatedAt: new Date() }).where(eq(s.matches.id, matchId));
}

export function winnerOf(m: Pick<s.Match, "homeTeamId" | "awayTeamId" | "homeScore" | "awayScore" | "homePens" | "awayPens" | "status">) {
  if (m.status !== "FULL_TIME" || m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore > m.awayScore) return m.homeTeamId;
  if (m.awayScore > m.homeScore) return m.awayTeamId;
  if (m.homePens != null && m.awayPens != null && m.homePens !== m.awayPens) return m.homePens > m.awayPens ? m.homeTeamId : m.awayTeamId;
  return null;
}

/** When a knockout tie finishes, push the winner into the next round automatically. */
export async function advanceKnockout(matchId: string) {
  const m = await db.query.matches.findFirst({ where: eq(s.matches.id, matchId) });
  if (!m || !m.bracketSlot) return;
  const w = winnerOf(m);
  if (!w) return;
  if (m.stage === "FINAL") {
    await db.update(s.seasons).set({ championId: w }).where(eq(s.seasons.id, m.seasonId));
    return;
  }
  const nextStage = m.stage === "QUARTER_FINAL" ? "SEMI_FINAL" : m.stage === "SEMI_FINAL" ? "FINAL" : null;
  if (!nextStage) return;
  const nextSlot = Math.ceil(m.bracketSlot / 2);
  const isHome = m.bracketSlot % 2 === 1;
  const next = await db.query.matches.findFirst({
    where: and(eq(s.matches.seasonId, m.seasonId), eq(s.matches.stage, nextStage), eq(s.matches.bracketSlot, nextSlot)),
  });
  if (!next) return;
  await db
    .update(s.matches)
    .set(isHome ? { homeTeamId: w } : { awayTeamId: w })
    .where(eq(s.matches.id, next.id));
}

/** Automatic suspensions: straight red / second yellow = 1 match, every 3rd yellow in a season = 1 match. */
export async function applyDiscipline(eventId: string) {
  const e = await db.query.matchEvents.findFirst({ where: eq(s.matchEvents.id, eventId), with: { match: true } });
  if (!e || !e.playerId) return null;
  let reason: string | null = null;
  if (e.type === "RED" || e.type === "SECOND_YELLOW") reason = e.type === "RED" ? "One-match ban (straight red card)" : "One-match ban (two yellow cards)";
  if (e.type === "YELLOW") {
    const { rows } = await pool.query(
      "select count(*)::int c from match_events e join matches m on m.id=e.match_id where e.player_id=$1 and e.type='YELLOW' and m.season_id=$2",
      [e.playerId, e.match.seasonId],
    );
    if (rows[0].c > 0 && rows[0].c % 3 === 0) reason = `One-match ban (${rows[0].c} yellow cards this season)`;
  }
  if (!reason) return null;
  const next = await db.query.matches.findFirst({
    where: and(
      or(eq(s.matches.homeTeamId, e.teamId), eq(s.matches.awayTeamId, e.teamId)),
      gt(s.matches.kickoff, e.match.kickoff),
      inArray(s.matches.status, ["SCHEDULED", "POSTPONED"]),
      eq(s.matches.seasonId, e.match.seasonId),
    ),
    orderBy: asc(s.matches.kickoff),
  });
  const until = next ? new Date(next.kickoff.getTime() + 1000 * 60 * 60 * 6) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 8);
  await db.update(s.players).set({ status: "SUSPENDED", statusNote: reason, statusUntil: until }).where(eq(s.players.id, e.playerId));
  return reason;
}
