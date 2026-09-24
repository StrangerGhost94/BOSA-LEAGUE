import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, or, sql, gte, lte } from "drizzle-orm";
import { cache } from "react";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { computeStandings, type StandingRow } from "./standings";

export type TeamLite = Pick<s.Team, "id" | "slug" | "name" | "shortName" | "crest" | "primaryColor" | "secondaryColor">;

export async function expireStatuses() {
  await pool.query(
    "update players set status='ACTIVE', status_note=null, status_until=null where status in ('SUSPENDED','INJURED') and status_until is not null and status_until < now()",
  );
}

export async function getCompetitions() {
  return db.query.competitions.findMany({ orderBy: asc(s.competitions.order) });
}

export async function getCompetition(slug: string) {
  const comp = await db.query.competitions.findFirst({ where: eq(s.competitions.slug, slug) });
  if (!comp) return null;
  const season = await db.query.seasons.findFirst({
    where: and(eq(s.seasons.competitionId, comp.id), eq(s.seasons.isCurrent, true)),
    orderBy: desc(s.seasons.year),
  });
  return { comp, season };
}

export async function getCurrentSeason(slug: string) {
  const r = await getCompetition(slug);
  return r?.season ?? null;
}

export const getTeams = cache(async () => db.query.teams.findMany({ orderBy: asc(s.teams.name) }));

export async function teamMap() {
  const all = await getTeams();
  return Object.fromEntries(all.map((t) => [t.id, t])) as Record<string, s.Team>;
}

export type TableRow = StandingRow & { team: s.Team };

export async function getSeasonTable(seasonId: string, includeLive = true): Promise<TableRow[]> {
  const season = await db.query.seasons.findFirst({ where: eq(s.seasons.id, seasonId), with: { teams: true } });
  if (!season) return [];
  const ms = await db
    .select()
    .from(s.matches)
    .where(and(eq(s.matches.seasonId, seasonId), inArray(s.matches.stage, ["LEAGUE"])));
  const adj = Object.fromEntries(season.teams.map((t) => [t.teamId, t.pointsAdjustment]));
  const baselines = Object.fromEntries(
    season.teams.map((t) => [
      t.teamId,
      { played: t.basePlayed, won: t.baseWon, drawn: t.baseDrawn, lost: t.baseLost, goalsFor: t.baseGoalsFor, goalsAgainst: t.baseGoalsAgainst, form: t.baseForm },
    ]),
  );
  const rows = computeStandings(
    season.teams.map((t) => t.teamId),
    ms,
    { win: season.pointsWin, draw: season.pointsDraw, includeLive, adjustments: adj, baselines },
  );
  const tm = await teamMap();
  return rows.map((r) => ({ ...r, team: tm[r.teamId] }));
}

export async function getGroupTables(seasonId: string) {
  const gs = await db.query.groups.findMany({
    where: eq(s.groups.seasonId, seasonId),
    orderBy: asc(s.groups.order),
    with: { teams: true },
  });
  const tm = await teamMap();
  const out: { id: string; name: string; rows: TableRow[] }[] = [];
  for (const g of gs) {
    const ms = await db.select().from(s.matches).where(eq(s.matches.groupId, g.id));
    const rows = computeStandings(g.teams.map((t) => t.teamId), ms, { includeLive: true });
    out.push({ id: g.id, name: g.name, rows: rows.map((r) => ({ ...r, team: tm[r.teamId] })) });
  }
  return out;
}

const matchWith = {
  homeTeam: true,
  awayTeam: true,
  venue: true,
  season: { with: { competition: true } },
  group: true,
} as const;

export type MatchFull = Awaited<ReturnType<typeof getMatches>>[number];

export async function getMatches(opts: {
  seasonId?: string;
  seasonIds?: string[];
  teamId?: string;
  venueId?: string;
  status?: "upcoming" | "completed" | "live" | "all";
  from?: Date;
  to?: Date;
  matchday?: number;
  stage?: s.Stage;
  limit?: number;
  order?: "asc" | "desc";
  refereeId?: string;
}) {
  const conds = [];
  if (opts.seasonId) conds.push(eq(s.matches.seasonId, opts.seasonId));
  if (opts.seasonIds?.length) conds.push(inArray(s.matches.seasonId, opts.seasonIds));
  if (opts.teamId) conds.push(or(eq(s.matches.homeTeamId, opts.teamId), eq(s.matches.awayTeamId, opts.teamId)));
  if (opts.venueId) conds.push(eq(s.matches.venueId, opts.venueId));
  if (opts.matchday) conds.push(eq(s.matches.matchday, opts.matchday));
  if (opts.stage) conds.push(eq(s.matches.stage, opts.stage));
  if (opts.refereeId) conds.push(eq(s.matches.refereeId, opts.refereeId));
  if (opts.from) conds.push(gte(s.matches.kickoff, opts.from));
  if (opts.to) conds.push(lte(s.matches.kickoff, opts.to));
  if (opts.status === "upcoming") conds.push(inArray(s.matches.status, ["SCHEDULED", "POSTPONED"]));
  if (opts.status === "completed") conds.push(eq(s.matches.status, "FULL_TIME"));
  if (opts.status === "live") conds.push(inArray(s.matches.status, ["LIVE", "HALF_TIME"]));
  return db.query.matches.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: matchWith,
    orderBy: opts.order === "desc" ? desc(s.matches.kickoff) : asc(s.matches.kickoff),
    limit: opts.limit,
  });
}

export async function getMatch(id: string) {
  return db.query.matches.findFirst({
    where: eq(s.matches.id, id),
    with: {
      ...matchWith,
      referee: { columns: { id: true, name: true } },
      potm: true,
      events: {
        with: { player: true, assist: true, playerOff: true },
        orderBy: asc(s.matchEvents.minute),
      },
      lineups: { with: { player: true } },
    },
  });
}

export async function getLiveMatches() {
  return getMatches({ status: "live" });
}

export async function getNextMatches(limit = 7) {
  return db.query.matches.findMany({
    where: and(inArray(s.matches.status, ["SCHEDULED", "LIVE", "HALF_TIME"]), gte(s.matches.kickoff, new Date(Date.now() - 1000 * 60 * 60 * 3))),
    with: matchWith,
    orderBy: asc(s.matches.kickoff),
    limit,
  });
}

export async function getRecentResults(limit = 6, seasonIds?: string[]) {
  return db.query.matches.findMany({
    where: and(eq(s.matches.status, "FULL_TIME"), isNotNull(s.matches.homeScore), seasonIds?.length ? inArray(s.matches.seasonId, seasonIds) : undefined),
    with: matchWith,
    orderBy: desc(s.matches.kickoff),
    limit,
  });
}

export async function getVenues() {
  return db.query.venues.findMany({ orderBy: asc(s.venues.name) });
}

/* -------------------- Player statistics -------------------- */

export type PlayerStat = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: s.Position;
  status: s.PlayerStatus;
  statusNote: string | null;
  affiliation: string;
  completionYear: number | null;
  teamId: string;
  teamName: string;
  teamSlug: string;
  crest: string;
  primaryColor: string;
  goals: number;
  assists: number;
  apps: number;
  starts: number;
  yellows: number;
  reds: number;
  cleanSheets: number;
  potm: number;
};

export async function getPlayerStats(opts: { seasonId?: string | null; teamId?: string | null; playerId?: string | null; includePending?: boolean } = {}): Promise<PlayerStat[]> {
  const { rows } = await pool.query(
    `
    with ev as (
      select e.player_id pid,
        count(*) filter (where e.type in ('GOAL','PENALTY_GOAL'))::int goals,
        count(*) filter (where e.type in ('YELLOW'))::int yellows,
        count(*) filter (where e.type in ('RED','SECOND_YELLOW'))::int reds
      from match_events e join matches m on m.id = e.match_id
      where ($1::text is null or m.season_id = $1) and e.player_id is not null
      group by e.player_id
    ),
    asx as (
      select e.assist_id pid, count(*)::int assists
      from match_events e join matches m on m.id = e.match_id
      where ($1::text is null or m.season_id = $1) and e.assist_id is not null
      group by e.assist_id
    ),
    ap as (
      select l.player_id pid, count(*)::int apps, count(*) filter (where l.starter)::int starts,
        count(*) filter (where p.position = 'GK' and l.starter and m.status = 'FULL_TIME' and (
          (l.team_id = m.home_team_id and m.away_score = 0) or (l.team_id = m.away_team_id and m.home_score = 0)))::int clean_sheets
      from lineups l join matches m on m.id = l.match_id join players p on p.id = l.player_id
      where ($1::text is null or m.season_id = $1)
      group by l.player_id
    ),
    pm as (
      select m.potm_id pid, count(*)::int potm from matches m
      where m.potm_id is not null and ($1::text is null or m.season_id = $1)
      group by m.potm_id
    )
    select p.id, p.first_name "firstName", p.last_name "lastName", p.number, p.position, p.status, p.status_note "statusNote",
      p.affiliation, p.completion_year "completionYear", p.team_id "teamId", t.name "teamName", t.slug "teamSlug", t.crest, t.primary_color "primaryColor",
      (coalesce(ev.goals,0) + case when $1::text is null or exists (select 1 from seasons cs join competitions cc on cc.id = cs.competition_id where cs.id = $1 and cs.is_current and cc.type = 'LEAGUE') then p.base_goals else 0 end)::int goals,
      (coalesce(asx.assists,0) + case when $1::text is null or exists (select 1 from seasons cs join competitions cc on cc.id = cs.competition_id where cs.id = $1 and cs.is_current and cc.type = 'LEAGUE') then p.base_assists else 0 end)::int assists,
      (coalesce(ap.apps,0) + case when $1::text is null or exists (select 1 from seasons cs join competitions cc on cc.id = cs.competition_id where cs.id = $1 and cs.is_current and cc.type = 'LEAGUE') then p.base_apps else 0 end)::int apps, coalesce(ap.starts,0) starts,
      coalesce(ev.yellows,0) yellows, coalesce(ev.reds,0) reds, coalesce(ap.clean_sheets,0) "cleanSheets", coalesce(pm.potm,0) potm
    from players p
    join teams t on t.id = p.team_id
    left join ev on ev.pid = p.id
    left join asx on asx.pid = p.id
    left join ap on ap.pid = p.id
    left join pm on pm.pid = p.id
    where ($2::text is null or p.team_id = $2)
      and ($3::text is null or p.id = $3)
      and ($4::boolean or p.status not in ('PENDING','REJECTED'))
    order by 15 desc, 16 desc, p.last_name asc
    `,
    [opts.seasonId ?? null, opts.teamId ?? null, opts.playerId ?? null, !!opts.includePending],
  );
  return rows as PlayerStat[];
}

export async function getTopScorers(seasonId: string, limit = 5) {
  const all = await getPlayerStats({ seasonId });
  return all.filter((p) => p.goals > 0).slice(0, limit);
}

export async function getTopAssists(seasonId: string, limit = 5) {
  const all = await getPlayerStats({ seasonId });
  return all
    .filter((p) => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, limit);
}

export async function getSeasonTotals(seasonId: string) {
  const { rows } = await pool.query(
    `select
      count(*) filter (where status='FULL_TIME')::int played,
      count(*)::int total,
      coalesce(sum(home_score + away_score) filter (where status='FULL_TIME'),0)::int goals,
      coalesce(sum(attendance) filter (where status='FULL_TIME'),0)::int attendance,
      (select count(*) from match_events e join matches m2 on m2.id=e.match_id where m2.season_id=$1 and e.type in ('YELLOW'))::int yellows,
      (select count(*) from match_events e join matches m2 on m2.id=e.match_id where m2.season_id=$1 and e.type in ('RED','SECOND_YELLOW'))::int reds,
      (select count(*) from matches m3 where m3.season_id=$1 and m3.status='FULL_TIME' and (m3.home_score=0 or m3.away_score=0))::int clean_sheets
     from matches where season_id=$1`,
    [seasonId],
  );
  const { rows: b } = await pool.query(
    "select coalesce(sum(base_played),0)::int played, coalesce(sum(base_goals_for),0)::int goals from season_teams where season_id=$1",
    [seasonId],
  );
  const { rows: c } = await pool.query(
    "select count(*)::int played, coalesce(sum(home_score + away_score),0)::int goals from matches where season_id=$1 and status='FULL_TIME' and counts_in_table and home_score is not null",
    [seasonId],
  );
  const r = rows[0] as { played: number; total: number; goals: number; attendance: number; yellows: number; reds: number; clean_sheets: number };
  return { ...r, played: Math.round(b[0].played / 2) + c[0].played, goals: b[0].goals + c[0].goals };
}

export async function getTeamRecord(teamId: string, seasonId?: string) {
  const ms = await db
    .select()
    .from(s.matches)
    .where(and(or(eq(s.matches.homeTeamId, teamId), eq(s.matches.awayTeamId, teamId)), seasonId ? eq(s.matches.seasonId, seasonId) : undefined));
  const [row] = computeStandings([teamId], ms);
  return row;
}

export async function getArticles(opts: { category?: string; limit?: number; competitionId?: string; teamId?: string; includeDrafts?: boolean } = {}) {
  const conds = [];
  if (!opts.includeDrafts) conds.push(eq(s.articles.published, true));
  if (opts.category) conds.push(eq(s.articles.category, opts.category as s.ArticleCategory));
  if (opts.competitionId) conds.push(eq(s.articles.competitionId, opts.competitionId));
  if (opts.teamId) conds.push(eq(s.articles.teamId, opts.teamId));
  return db.query.articles.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: { competition: true, team: true },
    orderBy: desc(s.articles.publishedAt),
    limit: opts.limit,
  });
}

export async function getSetting(key: string, fallback = "") {
  const r = await db.query.settings.findFirst({ where: eq(s.settings.key, key) });
  return r?.value ?? fallback;
}

export async function getMembershipPrice() {
  return parseInt(await getSetting("membership_price", "10000"), 10) || 10000;
}

export async function getHonours(competitionId?: string) {
  return db.query.honours.findMany({
    where: competitionId ? eq(s.honours.competitionId, competitionId) : undefined,
    with: { competition: true },
    orderBy: desc(s.honours.year),
  });
}

export async function getRules(competitionId?: string | null) {
  return db.query.rules.findMany({
    where: competitionId ? or(eq(s.rules.competitionId, competitionId), sql`${s.rules.competitionId} is null`) : undefined,
    with: { competition: true },
    orderBy: [asc(s.rules.competitionId), asc(s.rules.order)],
  });
}

export async function getSeasonsForAdmin() {
  return db.query.seasons.findMany({ with: { competition: true }, orderBy: [desc(s.seasons.isCurrent), desc(s.seasons.year)] });
}

export async function getCurrentSeasonIds() {
  const ss = await db.select({ id: s.seasons.id }).from(s.seasons).where(eq(s.seasons.isCurrent, true));
  return ss.map((x) => x.id);
}

