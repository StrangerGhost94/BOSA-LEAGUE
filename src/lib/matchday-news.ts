import "server-only";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { computeStandings, type StandingRow } from "@/lib/standings";

/**
 * The automatic newsroom. Nobody has to write these: they come straight from the fixtures and results.
 *
 * - Matchday preview: appears in the week before a matchday (fixtures, the headline match, the table picture).
 * - Matchday round-up: appears with the first result and is rewritten after every result until the
 *   matchday is complete (results, biggest win, who scored, the new top of the table).
 *
 * Safe to run as often as you like: each story has a fixed address and is only rewritten when it changes.
 */

const TZ = "Africa/Kampala";
const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const n = (x: number) => WORDS[x] ?? String(x);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const pts = (x: number) => `${x} point${x === 1 ? "" : "s"}`;
const ord = (x: number) => `${x}${["th", "st", "nd", "rd"][x % 100 > 10 && x % 100 < 14 ? 0 : x % 10 < 4 ? x % 10 : 0]}`;

type M = typeof s.matches.$inferSelect;

export type MatchdayStory = { slug: string; title: string; excerpt: string; body: string; publishedAt: Date; notify: boolean };

async function loadSeason() {
  const comp = await db.query.competitions.findFirst({ where: eq(s.competitions.type, "LEAGUE") });
  if (!comp) return null;
  const season = await db.query.seasons.findFirst({ where: and(eq(s.seasons.competitionId, comp.id), eq(s.seasons.isCurrent, true)) });
  if (!season) return null;
  const [teams, st, matches] = await Promise.all([
    db.query.teams.findMany(),
    db.select().from(s.seasonTeams).where(eq(s.seasonTeams.seasonId, season.id)),
    db.select().from(s.matches).where(and(eq(s.matches.seasonId, season.id), eq(s.matches.stage, "LEAGUE"))),
  ]);
  return { comp, season, teams: new Map(teams.map((t) => [t.id, t])), st, matches: matches.filter((m) => m.status !== "CANCELLED" && m.homeTeamId && m.awayTeamId) };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof loadSeason>>>;

function tableAfter(ctx: Ctx, md: number | null): StandingRow[] {
  const ms = md == null ? ctx.matches : ctx.matches.filter((m) => (m.matchday ?? 0) <= md);
  return computeStandings(
    ctx.st.map((t) => t.teamId),
    ms,
    {
      win: ctx.season.pointsWin,
      draw: ctx.season.pointsDraw,
      includeLive: false,
      adjustments: Object.fromEntries(ctx.st.map((t) => [t.teamId, t.pointsAdjustment])),
      baselines: Object.fromEntries(ctx.st.map((t) => [t.teamId, { played: t.basePlayed, won: t.baseWon, drawn: t.baseDrawn, lost: t.baseLost, goalsFor: t.baseGoalsFor, goalsAgainst: t.baseGoalsAgainst, form: t.baseForm }])),
    },
  );
}

const nm = (ctx: Ctx, id: string | null) => (id ? ctx.teams.get(id)?.name ?? "TBC" : "TBC");
const done = (m: M) => m.status === "FULL_TIME" && m.homeScore != null && m.awayScore != null;
const scoreLine = (ctx: Ctx, m: M) => `${nm(ctx, m.homeTeamId)} ${m.homeScore}-${m.awayScore} ${nm(ctx, m.awayTeamId)}`;

/* ------------------------------------------------------------------ round-up */

async function roundUp(ctx: Ctx, md: number, list: M[]): Promise<MatchdayStory | null> {
  const played = list.filter(done).sort((a, b) => +a.kickoff - +b.kickoff);
  if (!played.length) return null;
  const complete = played.length === list.length;
  const goals = played.reduce((a, m) => a + m.homeScore! + m.awayScore!, 0);
  const before = tableAfter(ctx, md - 1);
  const after = tableAfter({ ...ctx, matches: ctx.matches.filter((m) => (m.matchday ?? 0) < md || played.includes(m)) }, null);
  const leader = after[0];
  const prevLeader = before[0];
  const leaderName = nm(ctx, leader.teamId);
  const opening = !prevLeader || prevLeader.played === 0;
  const leaderChanged = !opening && prevLeader.teamId !== leader.teamId;

  const margin = (m: M) => Math.abs(m.homeScore! - m.awayScore!);
  const big = [...played].sort((a, b) => margin(b) - margin(a) || b.homeScore! + b.awayScore! - (a.homeScore! + a.awayScore!))[0];
  const bigWinner = big.homeScore! > big.awayScore! ? big.homeTeamId : big.awayScore! > big.homeScore! ? big.awayTeamId : null;
  const bigLoser = bigWinner === big.homeTeamId ? big.awayTeamId : big.homeTeamId;
  const bigScore = `${Math.max(big.homeScore!, big.awayScore!)}-${Math.min(big.homeScore!, big.awayScore!)}`;
  const draws = played.filter((m) => m.homeScore === m.awayScore);

  // Scorers (only matches whose goals were logged event by event)
  const { rows: scorers } = await pool.query<{ name: string; team: string; goals: number }>(
    `select p.first_name || ' ' || p.last_name as name, t.name as team, count(*)::int goals
       from match_events e join players p on p.id = e.player_id join teams t on t.id = e.team_id
      where e.match_id = any($1::text[]) and e.type in ('GOAL','PENALTY_GOAL')
      group by 1, 2 order by 3 desc, 1 limit 8`,
    [played.map((m) => m.id)],
  );
  const hatTricks = scorers.filter((x) => x.goals >= 3);

  // Headline
  let title: string;
  if (!complete) title = `Matchday ${md} live: ${played.length} of ${list.length} results in`;
  else if (opening) title = `Matchday ${md}: ${leaderName} lead the way`;
  else if (leaderChanged) title = `Matchday ${md}: ${leaderName} go top`;
  else title = `Matchday ${md}: ${leaderName} stay top`;
  if (complete && bigWinner && margin(big) >= 3 && bigWinner !== leader.teamId) title += ` as ${nm(ctx, bigWinner)} win ${bigScore}`;
  else if (complete && hatTricks[0]) title += `, hat-trick for ${hatTricks[0].name}`;

  const excerpt = complete
    ? `${cap(n(played.length))} matches, ${goals} goals. ${bigWinner ? `${nm(ctx, bigWinner)} beat ${nm(ctx, bigLoser)} ${bigScore}, the biggest win of the day.` : "Every match ended level."} ${leaderName} lead on ${pts(leader.points)}.`
    : `${played.length} of ${list.length} Matchday ${md} matches are finished. This story updates after every result.`;

  const p: string[] = [];
  p.push(
    complete
      ? `Matchday ${md} of the ${ctx.season.name} BOSA League is complete: ${n(played.length)} matches and ${goals} goals at Henry's Pitch on ${day(played[0].kickoff)}.`
      : `Matchday ${md} is under way on ${day(played[0].kickoff)}. ${cap(n(played.length))} of the ${n(list.length)} matches are finished and this round-up updates after every result.`,
  );
  p.push(`RESULTS`);
  for (const m of played) p.push(`${scoreLine(ctx, m)}${m.homePens != null ? ` (${m.homePens}-${m.awayPens} on penalties)` : ""}`);
  const left = list.filter((m) => !done(m));
  if (left.length) p.push(`Still to play: ${left.map((m) => `${nm(ctx, m.homeTeamId)} v ${nm(ctx, m.awayTeamId)} (${time(m.kickoff)})`).join(", ")}.`);

  p.push(`TALKING POINTS`);
  if (bigWinner) p.push(`Biggest win: ${nm(ctx, bigWinner)} beat ${nm(ctx, bigLoser)} ${bigScore}.`);
  if (draws.length) p.push(`${draws.length === 1 ? "One draw" : `${cap(n(draws.length))} draws`}: ${draws.map((m) => scoreLine(ctx, m)).join(", ")}.`);
  if (scorers.length) p.push(`On the scoresheet: ${scorers.map((x) => `${x.name} (${x.team})${x.goals > 1 ? ` ${x.goals}` : ""}`).join(", ")}.`);
  if (hatTricks.length) p.push(`Hat-trick${hatTricks.length > 1 ? "s" : ""} for ${hatTricks.map((x) => `${x.name} of ${x.team}`).join(" and ")}.`);

  p.push(`THE TABLE`);
  p.push(
    opening
      ? `${leaderName} top the first table of the season on ${pts(leader.points)}.`
      : leaderChanged
      ? `${leaderName} are the new leaders on ${pts(leader.points)}, taking over from ${nm(ctx, prevLeader.teamId)}.`
      : `${leaderName} are top on ${pts(leader.points)}.`,
  );
  const top = after.slice(0, 4).map((r) => `${ord(r.position)} ${nm(ctx, r.teamId)} ${r.points} pts`);
  p.push(`Top four: ${top.join(", ")}.`);
  const cut = after[7];
  if (cut) p.push(`${nm(ctx, cut.teamId)} hold 8th place, the last Champions League spot, on ${pts(cut.points)}.`);

  const last = played[played.length - 1];
  return {
    slug: `${ctx.season.name.toLowerCase().replace(/\s+/g, "-")}-${ctx.season.year}-matchday-${md}-round-up`,
    title,
    excerpt,
    body: p.join("\n"),
    // Past matchdays keep their own date; a live one moves up with each result
    publishedAt: new Date(last.kickoff.getTime() + 2 * 3_600_000),
    notify: complete,
  };
}

/* ------------------------------------------------------------------ preview */

function preview(ctx: Ctx, md: number, list: M[]): MatchdayStory | null {
  const sorted = [...list].sort((a, b) => +a.kickoff - +b.kickoff);
  const first = sorted[0];
  const table = tableAfter(ctx, md - 1);
  const pos = Object.fromEntries(table.map((r) => [r.teamId, r]));
  const rank = (id: string | null) => (id ? pos[id]?.position ?? 99 : 99);
  const headline = [...sorted].sort((a, b) => rank(a.homeTeamId) + rank(a.awayTeamId) - (rank(b.homeTeamId) + rank(b.awayTeamId)))[0];
  const leader = table[0];
  const leaderMatch = sorted.find((m) => m.homeTeamId === leader?.teamId || m.awayTeamId === leader?.teamId);
  const hn = nm(ctx, headline.homeTeamId);
  const an = nm(ctx, headline.awayTeamId);
  const played = table.some((r) => r.played > 0);

  const p: string[] = [];
  p.push(`Matchday ${md} kicks off on ${day(first.kickoff)} at ${time(first.kickoff)}, ${n(sorted.length)} matches at Henry's Pitch, Kabalagala.`);
  if (played)
    p.push(
      `The pick of the day: ${hn} (${ord(rank(headline.homeTeamId))}) against ${an} (${ord(rank(headline.awayTeamId))}) at ${time(headline.kickoff)}.` +
        (leader && leaderMatch && leaderMatch !== headline ? ` Leaders ${nm(ctx, leader.teamId)} face ${nm(ctx, leaderMatch.homeTeamId === leader.teamId ? leaderMatch.awayTeamId : leaderMatch.homeTeamId)} at ${time(leaderMatch.kickoff)}.` : ""),
    );
  p.push(`FIXTURES`);
  for (const m of sorted) p.push(`${time(m.kickoff)}  ${nm(ctx, m.homeTeamId)} v ${nm(ctx, m.awayTeamId)}`);
  if (played && leader) {
    p.push(`THE TABLE`);
    p.push(`${nm(ctx, leader.teamId)} go into the matchday top on ${pts(leader.points)}${table[1] ? `, ${leader.points - table[1].points === 0 ? "level with" : `${leader.points - table[1].points} ahead of`} ${nm(ctx, table[1].teamId)}` : ""}.`);
  }
  return {
    slug: `${ctx.season.name.toLowerCase().replace(/\s+/g, "-")}-${ctx.season.year}-matchday-${md}-preview`,
    title: played ? `Matchday ${md} preview: ${hn} v ${an} headlines ${day(first.kickoff).split(" ")[0]}` : `Matchday ${md} preview: the season starts ${day(first.kickoff).split(" ")[0]}`,
    excerpt: `${cap(n(sorted.length))} matches from ${time(first.kickoff)} on ${day(first.kickoff)}. ${played ? `${hn} meet ${an} in the pick of the day.` : "Every club starts on zero."}`,
    body: p.join("\n"),
    publishedAt: new Date(Math.min(Date.now(), first.kickoff.getTime() - 6 * 86_400_000)),
    notify: false,
  };
}

/* ------------------------------------------------------------------ sync */

async function upsert(ctx: Ctx, story: MatchdayStory) {
  const existing = await db.query.articles.findFirst({ where: eq(s.articles.slug, story.slug), columns: { id: true, title: true, body: true, excerpt: true } });
  if (existing && existing.title === story.title && existing.body === story.body && existing.excerpt === story.excerpt) return false;
  if (existing) {
    await db.update(s.articles).set({ title: story.title, excerpt: story.excerpt, body: story.body, publishedAt: story.publishedAt }).where(eq(s.articles.id, existing.id));
  } else {
    await db.insert(s.articles).values({
      slug: story.slug,
      title: story.title,
      excerpt: story.excerpt,
      body: story.body,
      category: "MATCH_REPORT",
      competitionId: ctx.comp.id,
      featured: false,
      readMinutes: 2,
      authorName: "BOSA Newsroom",
      publishedAt: story.publishedAt,
    });
  }
  return true;
}

/** Writes or refreshes the automatic matchday stories. Returns what changed (for the engine's log). */
export async function syncMatchdayNews(): Promise<string[]> {
  const ctx = await loadSeason();
  if (!ctx) return [];
  const log: string[] = [];
  const byMd = new Map<number, M[]>();
  for (const m of ctx.matches) if (m.matchday) byMd.set(m.matchday, [...(byMd.get(m.matchday) ?? []), m]);
  const now = Date.now();
  const mds = [...byMd.keys()].sort((a, b) => a - b);
  const nextMd = mds.find((md) => byMd.get(md)!.some((m) => !done(m)));

  for (const md of mds) {
    const list = byMd.get(md)!;
    const r = await roundUp(ctx, md, list);
    if (r) {
      const changed = await upsert(ctx, r);
      if (changed) {
        log.push(`Newsroom: ${r.title}.`);
        // One notification per matchday, when its round-up is complete (not for old matchdays written later)
        if (r.notify && r.publishedAt.getTime() > now - 26 * 3_600_000) {
          const { inBackground, notifyLeagueNews } = await import("./push");
          inBackground("round-up", () => notifyLeagueNews(r.slug, r.title, r.excerpt));
        }
      }
    }
  }
  // Preview for the next matchday, once it is within a week and nothing has kicked off
  if (nextMd != null) {
    const list = byMd.get(nextMd)!;
    const first = Math.min(...list.map((m) => m.kickoff.getTime()));
    const started = list.some((m) => m.status !== "SCHEDULED");
    if (!started && first - now < 7 * 86_400_000 && first > now) {
      const pv = preview(ctx, nextMd, list);
      if (pv && (await upsert(ctx, pv))) log.push(`Newsroom: ${pv.title}.`);
    }
  }
  return log;
}

/* ------------------------------------------------------------------ the home page headline */

export type Moment =
  | { kind: "live"; md: number | null; live: number }
  | { kind: "today"; md: number; first: Date; count: number }
  | { kind: "underway"; md: number; done: number; total: number }
  | { kind: "after"; md: number; roundUp: MatchdayStory | null; nextFirst: Date | null; nextMd: number | null }
  | { kind: "tomorrow" | "week" | "later"; md: number; first: Date; count: number; headline: { home: string; away: string } | null }
  | { kind: "none" };

/**
 * Where the league is right now, the way the Premier League site frames it:
 * a matchday is live, happening today, just finished (for two days), coming up tomorrow, this week, or later.
 */
export async function currentMoment(): Promise<Moment> {
  const ctx = await loadSeason();
  if (!ctx || !ctx.matches.length) return { kind: "none" };
  const now = Date.now();
  const byMd = new Map<number, M[]>();
  for (const m of ctx.matches) if (m.matchday) byMd.set(m.matchday, [...(byMd.get(m.matchday) ?? []), m]);
  const mds = [...byMd.keys()].sort((a, b) => a - b);
  const kampalaDay = (d: Date | number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
  const today = kampalaDay(now);

  const liveMs = ctx.matches.filter((m) => m.status === "LIVE" || m.status === "HALF_TIME");
  if (liveMs.length) return { kind: "live", md: liveMs[0].matchday, live: liveMs.length };

  const nextMd = mds.find((md) => byMd.get(md)!.some((m) => !done(m)));
  const lastDoneMd = [...mds].reverse().find((md) => byMd.get(md)!.every(done));
  const nextList = nextMd != null ? byMd.get(nextMd)! : [];
  const nextFirst = nextList.length ? new Date(Math.min(...nextList.map((m) => m.kickoff.getTime()))) : null;

  // A matchday partly played
  if (nextMd != null && nextList.some(done)) return { kind: "underway", md: nextMd, done: nextList.filter(done).length, total: nextList.length };
  // Matchday today, nothing started yet
  if (nextFirst && kampalaDay(nextFirst) === today) return { kind: "today", md: nextMd!, first: nextFirst, count: nextList.length };

  // Just finished: for two days after the last final whistle (unless the next matchday is already tomorrow)
  if (lastDoneMd != null) {
    const lastKick = Math.max(...byMd.get(lastDoneMd)!.map((m) => m.kickoff.getTime()));
    const tomorrowNext = nextFirst && nextFirst.getTime() - now < 36 * 3_600_000;
    if (now - lastKick < 2 * 86_400_000 && !tomorrowNext) {
      return { kind: "after", md: lastDoneMd, roundUp: await roundUp(ctx, lastDoneMd, byMd.get(lastDoneMd)!), nextFirst, nextMd: nextMd ?? null };
    }
  }

  if (nextMd == null || !nextFirst) return { kind: "none" };
  const table = tableAfter(ctx, nextMd - 1);
  const rank = Object.fromEntries(table.map((r) => [r.teamId, r.position]));
  const pick = [...nextList].sort((a, b) => (rank[a.homeTeamId!] ?? 99) + (rank[a.awayTeamId!] ?? 99) - ((rank[b.homeTeamId!] ?? 99) + (rank[b.awayTeamId!] ?? 99)))[0];
  const headline = table.some((r) => r.played) && pick ? { home: nm(ctx, pick.homeTeamId), away: nm(ctx, pick.awayTeamId) } : null;
  const tomorrow = kampalaDay(now + 86_400_000) === kampalaDay(nextFirst);
  const kind = tomorrow ? "tomorrow" : nextFirst.getTime() - now < 7 * 86_400_000 ? "week" : "later";
  return { kind, md: nextMd, first: nextFirst, count: nextList.length, headline };
}

