import "server-only";
import { and, asc, eq, inArray, desc } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { computeStandings } from "@/lib/standings";
import { advanceKnockout } from "@/lib/match-service";
import { addDays, at, eatDay, nextSunday, orient, pairKey, planRemaining, roundRobin, seededBracket, slotTime, type Pair } from "@/lib/scheduler";

/**
 * The season engine keeps the calendar moving without anyone having to draw fixtures by hand:
 *
 *  1. League: every club plays every other club once, one matchday each Sunday.
 *  2. When the last league match is played, the champion is crowned and the top 8 go into a
 *     Champions League knock-out (1 v 8, 4 v 5, 2 v 7, 3 v 6), then semi-finals and a final on the following Sundays.
 *  3. After the Champions League final the league is in its off season until the League office sets the next start date.
 *  4. Opening day is the Super Cup (league champion v Champions League winner); league Matchday 1 is the following Sunday.
 *
 * It is safe to run at any time and as often as you like: each step only does work that is still missing.
 */

export type Phase = "NONE" | "PRESEASON" | "LEAGUE" | "CHAMPIONS" | "OFF_SEASON";
export const CL_PLACES = 8;
const SUPER_CUP_TIME = "15:00";

type Season = typeof s.seasons.$inferSelect;
type Match = typeof s.matches.$inferSelect;

async function current(type: "LEAGUE" | "CHAMPIONS" | "SUPER") {
  const rows = await db
    .select({ season: s.seasons, comp: s.competitions })
    .from(s.seasons)
    .innerJoin(s.competitions, eq(s.competitions.id, s.seasons.competitionId))
    .where(and(eq(s.competitions.type, type), eq(s.seasons.isCurrent, true)))
    .orderBy(asc(s.competitions.order), desc(s.seasons.year));
  return rows[0] ?? null;
}
async function competitionOf(type: "LEAGUE" | "CHAMPIONS" | "SUPER") {
  return db.query.competitions.findFirst({ where: eq(s.competitions.type, type), orderBy: asc(s.competitions.order) });
}
async function participants(seasonId: string) {
  return (await db.select({ id: s.seasonTeams.teamId }).from(s.seasonTeams).where(eq(s.seasonTeams.seasonId, seasonId))).map((r) => r.id);
}
async function leagueMatches(seasonId: string) {
  return db.select().from(s.matches).where(and(eq(s.matches.seasonId, seasonId), eq(s.matches.stage, "LEAGUE"))).orderBy(asc(s.matches.kickoff));
}

/** Pairings among the season's clubs that have no fixture yet */
function missingPairs(teamIds: string[], ms: Match[]): Pair[] {
  const have = new Set(ms.filter((m) => m.homeTeamId && m.awayTeamId).map((m) => pairKey(m.homeTeamId!, m.awayTeamId!)));
  const out: Pair[] = [];
  for (let i = 0; i < teamIds.length; i++) for (let j = i + 1; j < teamIds.length; j++) if (!have.has(pairKey(teamIds[i], teamIds[j]))) out.push([teamIds[i], teamIds[j]]);
  return out;
}

async function leagueProgress(league: Season) {
  const [ids, ms] = await Promise.all([participants(league.id), leagueMatches(league.id)]);
  const inSeason = new Set(ids);
  const relevant = ms.filter((m) => m.homeTeamId && m.awayTeamId && inSeason.has(m.homeTeamId) && inSeason.has(m.awayTeamId) && m.status !== "CANCELLED");
  const played = relevant.filter((m) => m.status === "FULL_TIME").length;
  const missing = missingPairs(ids, ms).length;
  const total = relevant.length + missing;
  const started = played > 0 || relevant.some((m) => m.status !== "SCHEDULED" && m.status !== "POSTPONED");
  return { ids, ms, relevant, played, total, missing, done: total > 0 && missing === 0 && played === relevant.length, started };
}

async function finalTable(league: Season) {
  const st = await db.select().from(s.seasonTeams).where(eq(s.seasonTeams.seasonId, league.id));
  const ms = await leagueMatches(league.id);
  return computeStandings(
    st.map((t) => t.teamId),
    ms,
    {
      win: league.pointsWin,
      draw: league.pointsDraw,
      adjustments: Object.fromEntries(st.map((t) => [t.teamId, t.pointsAdjustment])),
      baselines: Object.fromEntries(
        st.map((t) => [t.teamId, { played: t.basePlayed, won: t.baseWon, drawn: t.baseDrawn, lost: t.baseLost, goalsFor: t.baseGoalsFor, goalsAgainst: t.baseGoalsAgainst, form: t.baseForm }]),
      ),
    },
  );
}

async function venueId() {
  const v = await db.query.venues.findFirst();
  return v?.id ?? null;
}

async function publish(slug: string, title: string, excerpt: string, body: string, competitionId: string | null) {
  await db
    .insert(s.articles)
    .values({ slug, title, excerpt, body, category: "COMPETITION", competitionId, featured: true, readMinutes: 1, authorName: "League Office" })
    .onConflictDoNothing();
}

const teamName = async (id: string | null) => (id ? (await db.query.teams.findFirst({ where: eq(s.teams.id, id) }))?.name ?? "TBC" : "TBC");

/* ------------------------------------------------------------------ */
/* State for pages                                                     */
/* ------------------------------------------------------------------ */

export async function getSeasonState() {
  const [L, C, S] = await Promise.all([current("LEAGUE"), current("CHAMPIONS"), current("SUPER")]);
  if (!L) return { phase: "NONE" as Phase, league: null, champions: C?.season ?? null, superCup: S?.season ?? null, played: 0, total: 0, clStage: null as string | null, superMatch: null as Match | null };
  const p = await leagueProgress(L.season);
  const clMatches = C ? await db.select().from(s.matches).where(eq(s.matches.seasonId, C.season.id)) : [];
  const final = clMatches.find((m) => m.stage === "FINAL");
  const clDone = !!C?.season.championId || (!!final && final.status === "FULL_TIME");
  const superMatch = S ? ((await db.query.matches.findFirst({ where: eq(s.matches.seasonId, S.season.id), orderBy: desc(s.matches.kickoff) })) ?? null) : null;
  let phase: Phase;
  if (!p.done) phase = p.started ? "LEAGUE" : "PRESEASON";
  else if (!clDone) phase = "CHAMPIONS";
  else phase = "OFF_SEASON";
  const pending = clMatches.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED");
  const clStage = pending.length ? (pending.some((m) => m.stage === "QUARTER_FINAL") ? "Quarter-finals" : pending.some((m) => m.stage === "SEMI_FINAL") ? "Semi-finals" : "Final") : clDone ? "Complete" : null;
  return { phase, league: L.season, champions: C?.season ?? null, superCup: S?.season ?? null, played: p.played, total: p.total, clStage, superMatch };
}
export type SeasonState = Awaited<ReturnType<typeof getSeasonState>>;

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

/** Adds the matchdays still needed so that every club meets every other club once. */
async function completeLeague(league: Season, log: string[]) {
  const p = await leagueProgress(league);
  const need = missingPairs(p.ids, p.ms);
  if (!need.length) return;
  const homes = new Map<string, number>();
  for (const m of p.ms) if (m.homeTeamId && m.status !== "CANCELLED") homes.set(m.homeTeamId, (homes.get(m.homeTeamId) ?? 0) + 1);
  const rounds = planRemaining(need);
  let md = Math.max(0, ...p.ms.map((m) => m.matchday ?? 0));
  const lastDay = p.ms.length ? eatDay(p.ms[p.ms.length - 1].kickoff) : league.startsAt ? eatDay(league.startsAt) : eatDay(new Date());
  let day = p.ms.length ? addDays(lastDay, 7) : nextSunday(lastDay);
  const today = eatDay(new Date());
  if (day <= today) day = nextSunday(today);
  const venue = await venueId();
  for (const round of rounds) {
    md++;
    const values = round.map((pair, i) => {
      const [h, a] = orient(pair, homes);
      const kickoff = at(day, slotTime(i));
      return {
        seasonId: league.id,
        stage: "LEAGUE" as const,
        round: `Matchday ${md}`,
        matchday: md,
        homeTeamId: h,
        awayTeamId: a,
        kickoff,
        venueId: venue,
        // Members see new fixtures straight away; everyone else from the Monday before
        publicFrom: at(addDays(day, -6), "08:00"),
      };
    });
    await db.insert(s.matches).values(values);
    log.push(`Scheduled Matchday ${md} (${values.length} matches) for ${day}.`);
    day = addDays(day, 7);
  }
}

/** League finished: crown the champion and draw the Champions League knock-out from the top 8. */
async function startChampionsLeague(league: Season, log: string[]) {
  const table = await finalTable(league);
  if (!table.length) return;
  if (!league.championId) {
    await db.update(s.seasons).set({ championId: table[0].teamId }).where(eq(s.seasons.id, league.id));
    league.championId = table[0].teamId;
    log.push(`${await teamName(table[0].teamId)} crowned ${league.name} champions.`);
  }
  let C = await current("CHAMPIONS");
  if (!C) {
    const comp = await competitionOf("CHAMPIONS");
    if (!comp) return;
    const [season] = await db.insert(s.seasons).values({ competitionId: comp.id, name: `${league.year} Edition`, year: league.year, isCurrent: true }).returning();
    C = { season, comp };
  }
  const existing = await db.select({ id: s.matches.id }).from(s.matches).where(eq(s.matches.seasonId, C.season.id)).limit(1);
  if (existing.length) return; // the draw has already been made (automatically or by hand)

  const seeds = table.slice(0, CL_PLACES).map((r) => r.teamId);
  const bracket = seededBracket(seeds);
  if (!bracket) return;
  const qualified = seeds.slice(0, bracket.ties.length * 2);
  await db.insert(s.seasonTeams).values(qualified.map((teamId) => ({ seasonId: C!.season.id, teamId }))).onConflictDoNothing();

  const ms = await leagueMatches(league.id);
  const last = ms.filter((m) => m.status === "FULL_TIME").reduce((d, m) => (m.kickoff > d ? m.kickoff : d), new Date(0));
  const today = eatDay(new Date());
  let day = nextSunday(eatDay(last) > today ? eatDay(last) : today);
  const venue = await venueId();
  const label = { QUARTER_FINAL: "Quarter-final", SEMI_FINAL: "Semi-final", FINAL: "Final" } as const;
  let stage: "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL" = bracket.stage;
  let ties: (Pair | [null, null])[] = bracket.ties;
  for (;;) {
    await db.insert(s.matches).values(
      ties.map(([h, a], i) => ({
        seasonId: C!.season.id,
        stage,
        round: label[stage],
        bracketSlot: i + 1,
        homeTeamId: h,
        awayTeamId: a,
        kickoff: at(day, slotTime(stage === "FINAL" ? 5 : i)),
        venueId: venue,
      })),
    );
    log.push(`Scheduled Champions League ${label[stage].toLowerCase()}${ties.length > 1 ? "s" : ""} for ${day}.`);
    if (stage === "FINAL") break;
    stage = stage === "QUARTER_FINAL" ? "SEMI_FINAL" : "FINAL";
    ties = Array.from({ length: ties.length / 2 }, () => [null, null] as [null, null]);
    day = addDays(day, 7);
  }
  const names = await Promise.all(bracket.ties.map(async ([h, a]) => `${await teamName(h)} v ${await teamName(a)}`));
  await publish(
    `${league.name.toLowerCase().replace(/\s+/g, "-")}-${league.year}-champions`,
    `${await teamName(league.championId)} are ${league.name} champions`,
    `The league season is complete. The top ${qualified.length} go into the Champions League knock-out.`,
    `${await teamName(league.championId)} finish top of the BOSA League table and are ${league.name} champions.\n\nThe top ${qualified.length} clubs qualify for the BOSA Champions League. The draw is seeded by league position:\n\n${names.join("\n")}\n\nEach tie is a single match. Level ties go straight to penalties. The winners meet in the next round the following Sunday.`,
    C.comp.id,
  );
}

/** Before a season kicks off, keep its fixtures in line with the clubs currently in the league. */
async function syncPreseason(league: Season, log: string[]) {
  if (!league.startsAt) return; // only seasons created by the engine
  const p = await leagueProgress(league);
  if (p.started) return;
  const active = (await db.select({ id: s.teams.id }).from(s.teams).where(eq(s.teams.active, true))).map((t) => t.id);
  const same = active.length === p.ids.length && active.every((id) => p.ids.includes(id));
  if (same && p.missing === 0) return;
  await db.delete(s.matches).where(and(eq(s.matches.seasonId, league.id), eq(s.matches.stage, "LEAGUE")));
  await db.delete(s.seasonTeams).where(eq(s.seasonTeams.seasonId, league.id));
  if (active.length) await db.insert(s.seasonTeams).values(active.map((teamId) => ({ seasonId: league.id, teamId })));
  await scheduleFullLeague(league, active);
  log.push(`Redrew ${league.name} fixtures for ${active.length} clubs.`);
}

async function scheduleFullLeague(league: Season, teamIds: string[]) {
  const order = [...teamIds].sort(() => Math.random() - 0.5);
  const rounds = roundRobin(order);
  const venue = await venueId();
  // Opening day is the Super Cup; league Matchday 1 is the following Sunday
  const day = nextSunday(eatDay(league.startsAt!));
  const rows = rounds.flatMap((round, r) => {
    const d = addDays(day, r * 7);
    return round.map(([h, a], i) => ({
      seasonId: league.id,
      stage: "LEAGUE" as const,
      round: `Matchday ${r + 1}`,
      matchday: r + 1,
      homeTeamId: h,
      awayTeamId: a,
      kickoff: at(d, slotTime(i)),
      venueId: venue,
      publicFrom: r === 0 ? null : at(addDays(d, -6), "08:00"),
    }));
  });
  if (rows.length) await db.insert(s.matches).values(rows);
  return rounds.length;
}

let lastRun = 0;
/** Runs the engine at most once a minute per server; used on page loads as a safety net. */
export async function tickSeasonEngine() {
  if (Date.now() - lastRun < 60_000) return;
  lastRun = Date.now();
  try {
    await runSeasonEngine();
  } catch (e) {
    console.error("Season engine:", e);
  }
}

export async function runSeasonEngine(): Promise<string[]> {
  const log: string[] = [];
  const client = await pool.connect();
  try {
    const { rows } = await client.query("select pg_try_advisory_lock(424242) ok");
    if (!rows[0].ok) return log;
    try {
      const L = await current("LEAGUE");
      if (!L) return log;
      const league = L.season;
      await syncPreseason(league, log);
      await completeLeague(league, log);
      const p = await leagueProgress(league);
      if (p.done) await startChampionsLeague(league, log);
      // Keep the Champions League bracket moving (covers results entered before this ran)
      const C = await current("CHAMPIONS");
      if (C) {
        const done = await db.select().from(s.matches).where(and(eq(s.matches.seasonId, C.season.id), eq(s.matches.status, "FULL_TIME")));
        for (const m of done) if (m.bracketSlot) await advanceKnockout(m.id);
        const champ = (await db.query.seasons.findFirst({ where: eq(s.seasons.id, C.season.id) }))?.championId;
        if (champ && league.championId) {
          await publish(
            `${league.name.toLowerCase().replace(/\s+/g, "-")}-${league.year}-complete`,
            `${await teamName(champ)} win the Champions League`,
            `${league.name} is complete. The off season begins; the League office will announce the next start date.`,
            `${await teamName(champ)} are the ${C.season.name} Champions League winners, and ${await teamName(league.championId)} are ${league.name} champions.\n\nThe two meet in the Super Cup, the match that opens next season. The League office will announce the date.`,
            C.comp.id,
          );
        }
      }
    } finally {
      await client.query("select pg_advisory_unlock(424242)");
    }
  } finally {
    client.release();
  }
  return log;
}

/* ------------------------------------------------------------------ */
/* Admin operations                                                    */
/* ------------------------------------------------------------------ */

/** The League office sets the opening day. Creates the new seasons, the Super Cup and every league fixture. */
export async function announceSeason(openingDay: string, superCupTime = SUPER_CUP_TIME) {
  const state = await getSeasonState();
  if (state.phase !== "OFF_SEASON" && state.phase !== "NONE") throw new Error("The current season is still running. A new season can be announced once the Champions League final has been played.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(openingDay)) throw new Error("Choose the opening day.");
  if (openingDay <= eatDay(new Date())) throw new Error("The opening day must be in the future.");
  if (!/^\d{2}:\d{2}$/.test(superCupTime)) throw new Error("Choose a kick-off time for the Super Cup.");
  const active = (await db.select({ id: s.teams.id }).from(s.teams).where(eq(s.teams.active, true))).map((t) => t.id);
  if (active.length < 4) throw new Error("At least four active clubs are needed to start a season.");

  const [lc, cc, sc] = await Promise.all([competitionOf("LEAGUE"), competitionOf("CHAMPIONS"), competitionOf("SUPER")]);
  if (!lc) throw new Error("The BOSA League competition is missing.");
  const prevLeague = state.league;
  const prevCL = state.champions;
  const num = (prevLeague?.name.match(/(\d+)/)?.[1] ? Number(prevLeague!.name.match(/(\d+)/)![1]) : 0) + 1;
  const name = `Season ${num}`;
  const year = Number(openingDay.slice(0, 4));
  const startsAt = at(openingDay, superCupTime);

  // Retire the current seasons (they stay on record and remain viewable)
  const comps = [lc, cc, sc].filter(Boolean).map((c) => c!.id);
  await db.update(s.seasons).set({ isCurrent: false }).where(inArray(s.seasons.competitionId, comps));

  const [league] = await db.insert(s.seasons).values({ competitionId: lc.id, name, year, isCurrent: true, startsAt }).returning();
  await db.insert(s.seasonTeams).values(active.map((teamId) => ({ seasonId: league.id, teamId })));
  const rounds = await scheduleFullLeague(league, active);

  if (cc) {
    const taken = await db.query.seasons.findFirst({ where: and(eq(s.seasons.competitionId, cc.id), eq(s.seasons.name, `${year} Edition`)) });
    await db.insert(s.seasons).values({ competitionId: cc.id, name: taken ? `${year} Edition (${name})` : `${year} Edition`, year, isCurrent: true });
  }

  let superLine = "";
  if (sc) {
    const [sup] = await db.insert(s.seasons).values({ competitionId: sc.id, name, year, isCurrent: true, startsAt }).returning();
    const home = prevLeague?.championId ?? null;
    let away = prevCL?.championId ?? null;
    // If one club won both, the league runner-up takes the second place
    if (home && away === home && prevLeague) away = (await finalTable(prevLeague))[1]?.teamId ?? null;
    if (home && away) {
      await db.insert(s.seasonTeams).values([{ seasonId: sup.id, teamId: home }, { seasonId: sup.id, teamId: away }]).onConflictDoNothing();
      await db.insert(s.matches).values({ seasonId: sup.id, stage: "FINAL", round: "Super Cup", bracketSlot: 1, homeTeamId: home, awayTeamId: away, kickoff: startsAt, venueId: await venueId() });
      superLine = `${name} opens with the Super Cup: ${await teamName(home)} v ${await teamName(away)}.`;
    }
  }

  const md1 = nextSunday(openingDay);
  await publish(
    `${name.toLowerCase().replace(/\s+/g, "-")}-${year}-announced`,
    `${name} kicks off on ${fmtDay(openingDay)}`,
    `${active.length} clubs, ${rounds} matchdays. ${superLine}`,
    `The League office has set the date: ${name} of the BOSA League opens on ${fmtDay(openingDay)}.\n\n${superLine}\n\nLeague Matchday 1 follows on ${fmtDay(md1)}. ${active.length} clubs each play every other club once, one matchday every Sunday at Henry's Pitch, Kabalagala. The top ${CL_PLACES} at the end of the league go into the Champions League.\n\nThe full fixture list is on the Fixtures page. Members can see every matchday now; everyone else sees each matchday from the Monday before.`,
    lc.id,
  );
  return { name, rounds, clubs: active.length, md1 };
}

function fmtDay(day: string) {
  return new Date(`${day}T12:00:00+03:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kampala" });
}

/**
 * A club withdraws. Its league results are removed from the table and its remaining fixtures are cancelled.
 * Any Champions League or Super Cup tie it still had to play is awarded 3-0 to the opponent.
 * Returns notes for the League office (for example opening-balance games that need checking).
 */
export async function withdrawTeam(teamId: string) {
  const team = await db.query.teams.findFirst({ where: eq(s.teams.id, teamId) });
  if (!team) throw new Error("Club not found.");
  const notes: string[] = [];
  await db.update(s.teams).set({ active: false, withdrawnAt: new Date() }).where(eq(s.teams.id, teamId));

  const state = await getSeasonState();
  const league = state.league;
  if (league && (state.phase === "LEAGUE" || state.phase === "CHAMPIONS")) {
    const inSeason = await db.query.seasonTeams.findFirst({ where: and(eq(s.seasonTeams.seasonId, league.id), eq(s.seasonTeams.teamId, teamId)) });
    if (inSeason && state.phase === "LEAGUE") {
      const ms = (await leagueMatches(league.id)).filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
      for (const m of ms) {
        const opp = m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId;
        // Results already inside the opening balance have to come out of the opponent's balance too
        if (m.status === "FULL_TIME" && m.countsInTable === false && opp) {
          if (m.homeScore == null || m.awayScore == null) {
            notes.push(`${m.round}: the score against ${await teamName(opp)} was never recorded, so check ${await teamName(opp)}'s opening balance.`);
          } else {
            const gf = m.homeTeamId === opp ? m.homeScore : m.awayScore;
            const ga = m.homeTeamId === opp ? m.awayScore : m.homeScore;
            await pool.query(
              `update season_teams set base_played=greatest(base_played-1,0), base_won=greatest(base_won-$3,0), base_drawn=greatest(base_drawn-$4,0), base_lost=greatest(base_lost-$5,0),
               base_goals_for=greatest(base_goals_for-$6,0), base_goals_against=greatest(base_goals_against-$7,0) where season_id=$1 and team_id=$2`,
              [league.id, opp, gf > ga ? 1 : 0, gf === ga ? 1 : 0, gf < ga ? 1 : 0, gf, ga],
            );
          }
        }
        await db
          .update(s.matches)
          .set({ status: "CANCELLED", countsInTable: false, statusNote: m.status === "FULL_TIME" ? `Result removed: ${team.name} withdrew from the league` : `Cancelled: ${team.name} withdrew from the league`, updatedAt: new Date() })
          .where(eq(s.matches.id, m.id));
      }
      await db.delete(s.seasonTeams).where(and(eq(s.seasonTeams.seasonId, league.id), eq(s.seasonTeams.teamId, teamId)));
      notes.push(`${ms.length} ${league.name} fixtures involving ${team.name} were removed or cancelled. The table has been updated.`);
    }
  }
  // Knock-out ties still to play (Champions League, Super Cup): the opponent goes through 3-0
  const koSeasons = [state.champions?.id, state.superCup?.id].filter(Boolean) as string[];
  if (koSeasons.length) {
    const ko = await db.select().from(s.matches).where(and(inArray(s.matches.seasonId, koSeasons), inArray(s.matches.status, ["SCHEDULED", "POSTPONED"])));
    for (const m of ko.filter((x) => x.homeTeamId === teamId || x.awayTeamId === teamId)) {
      const oppHome = m.awayTeamId === teamId;
      if (!(oppHome ? m.homeTeamId : m.awayTeamId)) continue;
      await db
        .update(s.matches)
        .set({ status: "FULL_TIME", homeScore: oppHome ? 3 : 0, awayScore: oppHome ? 0 : 3, statusNote: `Walkover: ${team.name} withdrew`, updatedAt: new Date() })
        .where(eq(s.matches.id, m.id));
      await advanceKnockout(m.id);
      notes.push(`${m.round}: awarded 3-0 to ${await teamName(oppHome ? m.homeTeamId : m.awayTeamId)}.`);
    }
  }
  await runSeasonEngine();
  if (state.phase === "PRESEASON") notes.push("The new season's fixtures have been redrawn without them.");
  if (state.phase === "OFF_SEASON" || state.phase === "NONE") notes.push("They will not be included when the next season is announced.");
  return notes;
}

/** A withdrawn club comes back. It plays from the next season (or at once, if the season has not kicked off yet). */
export async function reinstateTeam(teamId: string) {
  await db.update(s.teams).set({ active: true, withdrawnAt: null }).where(eq(s.teams.id, teamId));
  const state = await getSeasonState();
  await runSeasonEngine();
  return state.phase === "PRESEASON" ? "Reinstated. The new season's fixtures have been redrawn to include them." : state.phase === "OFF_SEASON" || state.phase === "NONE" ? "Reinstated. They will be in the next season." : "Reinstated. They will join from the next season.";
}
