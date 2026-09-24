import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "./schema";
import { TEAMS, MATCHDAY5, FIRST_NAMES, LAST_NAMES, COURSES } from "./seed-data";
import { computeStandings } from "../lib/standings";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });

/* deterministic randomness so every seed produces the same league */
let seed = 20260927;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
function poisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}
const eat = (date: string, time: string) => new Date(`${date}T${time}:00+03:00`);
const addDays = (date: string, d: number) => {
  const x = new Date(`${date}T12:00:00+03:00`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
};

type P = typeof s.players.$inferSelect;

async function main() {
  console.log("Seeding BOSA League...");
  const existing = await db.select().from(s.teams).limit(1);
  if (existing.length && !process.argv.includes("--force")) {
    console.log("Database already has data. Run `npm run db:reset` to wipe and reseed.");
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || "Bosa@2026", 10);

  /* ---------- Settings ---------- */
  await db.insert(s.settings).values([
    { key: "membership_price", value: "10000" },
    { key: "membership_currency", value: "UGX" },
    { key: "current_season_label", value: "Season 4" },
  ]);

  /* ---------- Venues ---------- */
  const [henrys, campus] = await db
    .insert(s.venues)
    .values([
      { name: "Henry's Pitch", area: "Kabalagala", address: "Behind Shell Kabalagala, Kampala", capacity: 800 },
      { name: "BOSA Floodlit Ground", area: "Kansanga", address: "Kansanga, Ggaba Road, Kampala", capacity: 500 },
    ])
    .returning();

  /* ---------- Teams ---------- */
  const teamRows = await db
    .insert(s.teams)
    .values(
      TEAMS.map((t) => ({
        slug: t.slug,
        name: t.name,
        shortName: t.shortName,
        crest: `/crests/${t.slug}.png`,
        primaryColor: t.primary,
        secondaryColor: t.secondary,
        campus: t.campus,
        founded: t.founded,
        motto: t.motto,
        homeVenue: "Henry's Pitch, Kabalagala",
        bio: `${t.name} represent ${t.campus} in the BOSA League, bringing together current students and alumni under one badge since ${t.founded}. The club is known across Kabalagala for its ${pick(["disciplined pressing", "fluid passing", "direct wing play", "resolute defending", "fearless youth", "matchday atmosphere"])} and a loyal travelling support.`,
      })),
    )
    .returning();
  const T = Object.fromEntries(teamRows.map((t) => [t.slug, t]));
  const strength = Object.fromEntries(TEAMS.map((t) => [t.slug, t.strength]));

  /* ---------- Players (16 per team) ---------- */
  const layout: s.Position[] = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "FWD"];
  const numbers = [1, 22, 2, 3, 4, 5, 15, 6, 8, 10, 14, 16, 7, 9, 11, 19];
  const usedNames = new Set<string>();
  const playerValues: (typeof s.players.$inferInsert)[] = [];
  for (const t of teamRows) {
    layout.forEach((pos, i) => {
      let fn = "", ln = "";
      do {
        fn = pick(FIRST_NAMES);
        ln = pick(LAST_NAMES);
      } while (usedNames.has(fn + ln));
      usedNames.add(fn + ln);
      const alumni = rand() < 0.35;
      playerValues.push({
        teamId: t.id,
        firstName: fn,
        lastName: ln,
        number: numbers[i],
        position: pos,
        affiliation: alumni ? "ALUMNI" : "STUDENT",
        course: pick(COURSES),
        yearOfStudy: alumni ? `Class of ${int(2016, 2024)}` : `Year ${int(1, 4)}`,
        birthYear: alumni ? int(1996, 2002) : int(2002, 2007),
        status: "ACTIVE",
      });
    });
  }
  const playerRows = await db.insert(s.players).values(playerValues).returning();
  const squad: Record<string, P[]> = {};
  for (const p of playerRows) (squad[p.teamId] ??= []).push(p);

  // captains
  for (const t of teamRows) {
    const cap = squad[t.id].find((p) => p.number === 10) ?? squad[t.id][0];
    await pool.query("update teams set captain_name=$1 where id=$2", [`${cap.firstName} ${cap.lastName}`, t.id]);
  }

  /* ---------- Users ---------- */
  const staff = await db
    .insert(s.users)
    .values([
      { name: "BOSA Super Admin", email: "superadmin@bosaleague.com", passwordHash, role: "SUPER_ADMIN", membership: "ACTIVE" },
      { name: "League Administrator", email: "admin@bosaleague.com", passwordHash, role: "LEAGUE_ADMIN", membership: "ACTIVE" },
      { name: "Competitions Desk", email: "competitions@bosaleague.com", passwordHash, role: "COMPETITION_MANAGER", membership: "ACTIVE" },
      { name: "Ref. Hakim Ssali", email: "referee1@bosaleague.com", passwordHash, role: "REFEREE", membership: "ACTIVE" },
      { name: "Ref. Joseph Kawooya", email: "referee2@bosaleague.com", passwordHash, role: "REFEREE", membership: "ACTIVE" },
      { name: "Ref. Umar Nsereko", email: "referee3@bosaleague.com", passwordHash, role: "REFEREE", membership: "ACTIVE" },
    ])
    .returning();
  const admin = staff[1];
  const referees = staff.slice(3);

  const coachNames = [
    "Coach Ibrahim Kasozi", "Coach Ronald Mutebi", "Coach Swaibu Lwanga", "Coach Hassan Kigozi", "Coach Musa Ssempijja",
    "Coach Denis Okello", "Coach Rashid Ntale", "Coach Allan Batte", "Coach Edgar Kamya", "Coach Samuel Lukwago",
    "Coach Sulaiman Mubiru", "Coach Patrick Kibirige", "Coach Twaha Nsamba", "Coach Joel Sentongo",
  ];
  await db.insert(s.users).values(
    teamRows.map((t, i) => ({
      name: coachNames[i],
      email: `coach.${t.slug}@bosaleague.com`,
      passwordHash,
      role: "TEAM_MANAGER" as const,
      membership: "ACTIVE" as const,
      teamId: t.id,
    })),
  );
  for (const [i, t] of teamRows.entries()) {
    await pool.query("update teams set coach_name=$1 where id=$2", [coachNames[i].replace("Coach ", ""), t.id]);
  }
  const star = squad[T["alhilal"].id].find((p) => p.number === 9)!;
  const fans = await db.insert(s.users).values([
    { name: `${star.firstName} ${star.lastName}`, email: "player@bosaleague.com", passwordHash, role: "PLAYER", membership: "ACTIVE", teamId: star.teamId, playerId: star.id },
    { name: "Aisha Namutebi", email: "fan@bosaleague.com", passwordHash, role: "STUDENT_FAN", membership: "ACTIVE", university: "Makerere University", membershipPaidAt: new Date("2026-09-02T10:00:00+03:00") },
    { name: "Kenneth Ssemwogerere", email: "alumni@bosaleague.com", passwordHash, role: "ALUMNI_FAN", membership: "NONE", university: "Kyambogo University" },
  ]).returning();
  await db.insert(s.payments).values([
    { userId: fans[0].id, amount: 10000, merchantRef: "BOSA-SEED-0001", status: "COMPLETED", provider: "PESAPAL", method: "MTN Mobile Money", confirmationCode: "MP260902.1402.A11234", createdAt: new Date("2026-09-01T18:20:00+03:00") },
    { userId: fans[1].id, amount: 10000, merchantRef: "BOSA-SEED-0002", status: "COMPLETED", provider: "PESAPAL", method: "Airtel Money", confirmationCode: "AM260902.0931.B55120", createdAt: new Date("2026-09-02T10:00:00+03:00") },
  ]);

  /* ---------- Competitions ---------- */
  const [league, champions, superLeague] = await db
    .insert(s.competitions)
    .values([
      { slug: "bosa-league", name: "BOSA League", shortName: "League", type: "LEAGUE", order: 1, tagline: "Fourteen clubs. One crown.", description: "The flagship competition. Fourteen registered clubs of students and alumni meet home and away across twenty-six matchdays at Henry's Pitch, Kabalagala. Three points for a win, one for a draw, and nowhere to hide." },
      { slug: "champions-league", name: "BOSA Champions League", shortName: "Champions League", type: "CHAMPIONS", order: 2, tagline: "Midweek nights. Knockout drama.", description: "Four groups, eight survivors, one trophy. The BOSA Champions League runs on midweek evenings, with the top two in each group advancing to single-leg quarter-finals, semi-finals and a showpiece final." },
      { slug: "super-league", name: "BOSA Super League", shortName: "Super League", type: "SUPER", order: 3, tagline: "Where students meet the alumni.", description: "A separate elite competition in which invited student and alumni sides meet over a single round-robin season. Registration opens each year to any university side that meets the BOSA eligibility rules." },
    ])
    .returning();

  /* ---------- BOSA League Season 4 ---------- */
  const [lgSeason] = await db
    .insert(s.seasons)
    .values({ competitionId: league.id, name: "Season 4", year: 2026, isCurrent: true, startsAt: eat("2026-08-30", "10:00"), endsAt: eat("2027-02-21", "16:00") })
    .returning();
  await db.insert(s.seasonTeams).values(teamRows.map((t) => ({ seasonId: lgSeason.id, teamId: t.id })));

  // Circle method positions so that round 5 is exactly the published Matchday 5
  const pos: Record<number, string> = {
    13: "dream-cast", 4: "sc-m19", 5: "karegular", 3: "albayan", 6: "alnasr", 2: "osasuna", 7: "alhilal",
    1: "ittihad", 8: "elites", 0: "la-masia", 9: "ahal-sunnah", 12: "los-blancos", 10: "golden-jubilee", 11: "hbm",
  };
  const times = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  type Fx = { md: number; home: string; away: string; date: string; time: string };
  const fixtures: Fx[] = [];
  for (let r = 0; r < 13; r++) {
    const pairs: [number, number][] = [[13, r]];
    for (let k = 1; k <= 6; k++) pairs.push([(r + k) % 13, (r - k + 13) % 13]);
    const date = addDays("2026-08-30", r * 7);
    pairs.forEach(([a, b], i) => {
      const swap = r % 2 !== 0; // round index 4 (Matchday 5) keeps poster orientation
      const home = swap ? pos[b] : pos[a];
      const away = swap ? pos[a] : pos[b];
      fixtures.push({ md: r + 1, home, away, date, time: times[i] });
    });
  }
  for (let r = 0; r < 13; r++) {
    const date = addDays("2026-08-30", (r + 13) * 7);
    fixtures
      .filter((f) => f.md === r + 1)
      .forEach((f, i) => fixtures.push({ md: r + 14, home: f.away, away: f.home, date, time: times[i] }));
  }
  // Sanity: matchday 5 must equal the poster
  const md5 = fixtures.filter((f) => f.md === 5);
  MATCHDAY5.forEach(([h, a, t], i) => {
    if (md5[i].home !== h || md5[i].away !== a || md5[i].time !== t) throw new Error(`Matchday 5 mismatch at ${i}`);
  });

  const PLAYED_UNTIL = 4;
  const createdLeagueMatches: { id: string; md: number }[] = [];
  for (const f of fixtures) {
    const played = f.md <= PLAYED_UNTIL;
    const [m] = await db
      .insert(s.matches)
      .values({
        seasonId: lgSeason.id,
        stage: "LEAGUE",
        round: `Matchday ${f.md}`,
        matchday: f.md,
        homeTeamId: T[f.home].id,
        awayTeamId: T[f.away].id,
        kickoff: eat(f.date, f.time),
        venueId: henrys.id,
        refereeId: referees[(f.md + times.indexOf(f.time)) % 3].id,
        status: "SCHEDULED",
      })
      .returning();
    createdLeagueMatches.push({ id: m.id, md: f.md });
    if (played) await playMatch(m.id, T[f.home].id, T[f.away].id, strength[f.home], strength[f.away]);
  }

  /* ---------- Simulated match engine for seeded results ---------- */
  async function playMatch(matchId: string, homeId: string, awayId: string, hs: number, as: number, knockout = false) {
    const lh = Math.max(0.35, 1.35 * Math.pow(hs / as, 1.6));
    const la = Math.max(0.35, 1.2 * Math.pow(as / hs, 1.6));
    const hGoals = Math.min(6, poisson(lh));
    const aGoals = Math.min(6, poisson(la));
    const events: (typeof s.matchEvents.$inferInsert)[] = [];
    const lineupRows: (typeof s.lineups.$inferInsert)[] = [];
    const scorersFor = (teamId: string) => {
      const sq = squad[teamId];
      const starters = [sq[0], ...sq.slice(2, 6), ...sq.slice(7, 11), ...sq.slice(12, 14)];
      const bench = [sq[6], sq[11], sq[14], sq[15]];
      return { starters, bench };
    };
    const sides = [
      { teamId: homeId, goals: hGoals, ...scorersFor(homeId) },
      { teamId: awayId, goals: aGoals, ...scorersFor(awayId) },
    ];
    let potmCandidate: { id: string; weight: number } | null = null;
    for (const side of sides) {
      side.starters.forEach((p) => lineupRows.push({ matchId, playerId: p.id, teamId: side.teamId, starter: true }));
      // substitutions
      const subsCount = int(2, 3);
      const onField = [...side.starters];
      for (let i = 0; i < subsCount; i++) {
        const on = side.bench[i];
        const offIdx = int(1, onField.length - 1);
        const off = onField[offIdx];
        onField[offIdx] = on;
        lineupRows.push({ matchId, playerId: on.id, teamId: side.teamId, starter: false });
        events.push({ matchId, teamId: side.teamId, type: "SUB", minute: int(46, 80), playerId: on.id, playerOffId: off.id });
      }
      const pool_ = [...side.starters, ...side.bench.slice(0, subsCount)];
      const weightOf = (p: P) => (p.position === "FWD" ? 6 : p.position === "MID" ? 3 : p.position === "DEF" ? 1 : 0);
      for (let g = 0; g < side.goals; g++) {
        const r = rand();
        const minute = int(3, 90);
        if (r < 0.04) {
          const opp = sides.find((x) => x.teamId !== side.teamId)!;
          events.push({ matchId, teamId: side.teamId, type: "OWN_GOAL", minute, playerId: pick(opp.starters.slice(1, 5)).id });
          continue;
        }
        const total = pool_.reduce((a, p) => a + weightOf(p), 0);
        let x = rand() * total;
        let scorer = pool_[0];
        for (const p of pool_) {
          x -= weightOf(p);
          if (x <= 0) {
            scorer = p;
            break;
          }
        }
        const isPen = r > 0.9;
        const assist = !isPen && rand() < 0.72 ? pick(pool_.filter((p) => p.id !== scorer.id && p.position !== "GK")) : null;
        events.push({ matchId, teamId: side.teamId, type: isPen ? "PENALTY_GOAL" : "GOAL", minute, playerId: scorer.id, assistId: assist?.id ?? null });
        const w = 3 + (side.goals > sides.find((q) => q.teamId !== side.teamId)!.goals ? 2 : 0);
        if (!potmCandidate || w + rand() > potmCandidate.weight) potmCandidate = { id: scorer.id, weight: w + rand() };
      }
      const yellows = int(0, 3);
      for (let i = 0; i < yellows; i++) {
        events.push({ matchId, teamId: side.teamId, type: "YELLOW", minute: int(10, 89), playerId: pick(pool_.slice(1)).id });
      }
      if (rand() < 0.05) events.push({ matchId, teamId: side.teamId, type: "RED", minute: int(40, 88), playerId: pick(pool_.slice(1, 9)).id });
    }
    let homePens: number | null = null;
    let awayPens: number | null = null;
    if (knockout && hGoals === aGoals) {
      homePens = int(3, 5);
      awayPens = homePens === 5 ? int(3, 4) : homePens + (rand() < 0.5 ? 1 : -1);
      if (awayPens < 0) awayPens = 2;
      if (awayPens === homePens) awayPens = homePens - 1;
    }
    if (!potmCandidate) potmCandidate = { id: pick(sides[hGoals >= aGoals ? 0 : 1].starters).id, weight: 0 };
    if (events.length) await db.insert(s.matchEvents).values(events);
    if (lineupRows.length) await db.insert(s.lineups).values(lineupRows);
    await pool.query(
      "update matches set status='FULL_TIME', home_score=$1, away_score=$2, home_pens=$3, away_pens=$4, minute=90, attendance=$5, potm_id=$6 where id=$7",
      [hGoals, aGoals, homePens, awayPens, int(180, 640), potmCandidate.id, matchId],
    );
    return { hGoals, aGoals, homePens, awayPens };
  }

  // One suspension carried into Matchday 5 and a couple of injuries
  const reds = await pool.query("select player_id from match_events where type='RED' limit 2");
  for (const r of reds.rows) {
    await pool.query("update players set status='SUSPENDED', status_note='One-match ban (straight red card)', status_until=$1 where id=$2", [eat("2026-09-28", "00:00"), r.player_id]);
  }
  const injured = [squad[T["los-blancos"].id][13], squad[T["alnasr"].id][8], squad[T["hbm"].id][3]];
  for (const p of injured) {
    await pool.query("update players set status='INJURED', status_note=$1, status_until=$2 where id=$3", [pick(["Hamstring strain", "Ankle ligament sprain", "Knee contusion"]), eat("2026-10-11", "00:00"), p.id]);
  }
  // Pending registrations waiting for approval
  await db.insert(s.players).values([
    { teamId: T["elites"].id, firstName: "Nuhu", lastName: "Kakooza", number: 21, position: "MID", affiliation: "STUDENT", course: "BSc Information Technology", yearOfStudy: "Year 1", birthYear: 2006, status: "PENDING" },
    { teamId: T["osasuna"].id, firstName: "Brian", lastName: "Ssentamu", number: 17, position: "FWD", affiliation: "ALUMNI", course: "Bachelor of Commerce", yearOfStudy: "Class of 2023", birthYear: 2000, status: "PENDING" },
    { teamId: T["karegular"].id, firstName: "Yahya", lastName: "Mubiru", number: 30, position: "GK", affiliation: "STUDENT", course: "BA Economics", yearOfStudy: "Year 2", birthYear: 2005, status: "PENDING" },
  ]);

  /* ---------- Champions League 2026 ---------- */
  const [clSeason] = await db
    .insert(s.seasons)
    .values({ competitionId: champions.id, name: "2026 Edition", year: 2026, isCurrent: true, startsAt: eat("2026-08-05", "17:00"), endsAt: eat("2026-10-21", "18:00") })
    .returning();
  await db.insert(s.seasonTeams).values(teamRows.map((t) => ({ seasonId: clSeason.id, teamId: t.id })));
  const groupDef: [string, string[]][] = [
    ["Group A", ["alhilal", "osasuna", "elites", "sc-m19"]],
    ["Group B", ["la-masia", "albayan", "karegular", "hbm"]],
    ["Group C", ["los-blancos", "ittihad", "golden-jubilee"]],
    ["Group D", ["alnasr", "ahal-sunnah", "dream-cast"]],
  ];
  const groupStandings: Record<string, string[]> = {};
  let wednesday = "2026-08-05";
  const roundsByGroup: Record<string, [string, string][][]> = {};
  for (const [gName, slugs] of groupDef) {
    const rounds: [string, string][][] =
      slugs.length === 4
        ? [
            [[slugs[0], slugs[3]], [slugs[1], slugs[2]]],
            [[slugs[2], slugs[0]], [slugs[3], slugs[1]]],
            [[slugs[0], slugs[1]], [slugs[2], slugs[3]]],
          ]
        : [[[slugs[0], slugs[2]]], [[slugs[1], slugs[0]]], [[slugs[2], slugs[1]]]];
    roundsByGroup[gName] = rounds;
  }
  const groupIds: Record<string, string> = {};
  for (const [i, [gName, slugs]] of groupDef.entries()) {
    const [g] = await db.insert(s.groups).values({ seasonId: clSeason.id, name: gName, order: i }).returning();
    groupIds[gName] = g.id;
    await db.insert(s.groupTeams).values(slugs.map((sl) => ({ groupId: g.id, teamId: T[sl].id })));
  }
  for (let r = 0; r < 3; r++) {
    const date = addDays(wednesday, r * 14);
    let slot = 0;
    for (const [gName] of groupDef) {
      for (const [h, a] of roundsByGroup[gName][r]) {
        const time = ["17:00", "18:15", "19:30"][slot % 3];
        const day = slot < 3 ? date : addDays(date, 1);
        slot++;
        const [m] = await db
          .insert(s.matches)
          .values({
            seasonId: clSeason.id,
            groupId: groupIds[gName],
            stage: "GROUP",
            round: `Group Stage · Round ${r + 1}`,
            matchday: r + 1,
            homeTeamId: T[h].id,
            awayTeamId: T[a].id,
            kickoff: eat(day, time),
            venueId: r === 1 ? campus.id : henrys.id,
            refereeId: referees[slot % 3].id,
          })
          .returning();
        await playMatch(m.id, T[h].id, T[a].id, strength[h], strength[a]);
      }
    }
  }
  for (const [gName, slugs] of groupDef) {
    const ms = await db.query.matches.findMany({ where: (m, { eq }) => eq(m.groupId, groupIds[gName]) });
    const table = computeStandings(slugs.map((x) => T[x].id), ms);
    groupStandings[gName] = table.map((r) => r.teamId);
  }
  const A = groupStandings["Group A"], B = groupStandings["Group B"], C = groupStandings["Group C"], D = groupStandings["Group D"];
  const qfPairs: [string, string][] = [[A[0], B[1]], [C[0], D[1]], [B[0], A[1]], [D[0], C[1]]];
  const slugOf = (id: string) => teamRows.find((t) => t.id === id)!.slug;
  const qfWinners: string[] = [];
  for (const [i, [h, a]] of qfPairs.entries()) {
    const [m] = await db
      .insert(s.matches)
      .values({
        seasonId: clSeason.id,
        stage: "QUARTER_FINAL",
        round: "Quarter-final",
        bracketSlot: i + 1,
        homeTeamId: h,
        awayTeamId: a,
        kickoff: eat(i < 2 ? "2026-09-22" : "2026-09-23", i % 2 === 0 ? "17:30" : "19:00"),
        venueId: henrys.id,
        refereeId: referees[i % 3].id,
      })
      .returning();
    const r = await playMatch(m.id, h, a, strength[slugOf(h)], strength[slugOf(a)], true);
    const homeWon = r.hGoals > r.aGoals || (r.hGoals === r.aGoals && (r.homePens ?? 0) > (r.awayPens ?? 0));
    qfWinners.push(homeWon ? h : a);
  }
  await db.insert(s.matches).values([
    { seasonId: clSeason.id, stage: "SEMI_FINAL", round: "Semi-final", bracketSlot: 1, homeTeamId: qfWinners[0], awayTeamId: qfWinners[1], kickoff: eat("2026-10-07", "17:30"), venueId: henrys.id, refereeId: referees[0].id },
    { seasonId: clSeason.id, stage: "SEMI_FINAL", round: "Semi-final", bracketSlot: 2, homeTeamId: qfWinners[2], awayTeamId: qfWinners[3], kickoff: eat("2026-10-07", "19:15"), venueId: henrys.id, refereeId: referees[1].id },
    { seasonId: clSeason.id, stage: "FINAL", round: "Final", bracketSlot: 1, homeTeamId: null, awayTeamId: null, kickoff: eat("2026-10-21", "18:00"), venueId: henrys.id, refereeId: referees[2].id },
  ]);

  /* ---------- Super League 2026 ---------- */
  const [slSeason] = await db
    .insert(s.seasons)
    .values({
      competitionId: superLeague.id,
      name: "2026 Season",
      year: 2026,
      isCurrent: true,
      startsAt: eat("2026-09-05", "14:00"),
      endsAt: eat("2026-10-17", "18:00"),
      registrationOpen: true,
      registrationNote: "Registration for the 2027 Super League is open until 30 November 2026. Sides must field at least six registered students and may include up to eight alumni in a matchday squad of eighteen.",
    })
    .returning();
  const slSlugs = ["alhilal", "la-masia", "los-blancos", "alnasr", "ahal-sunnah", "albayan", "sc-m19", "ittihad"];
  await db.insert(s.seasonTeams).values(slSlugs.map((x) => ({ seasonId: slSeason.id, teamId: T[x].id })));
  for (let r = 0; r < 7; r++) {
    const pairs: [number, number][] = [[7, r]];
    for (let k = 1; k <= 3; k++) pairs.push([(r + k) % 7, (r - k + 7) % 7]);
    const date = addDays("2026-09-05", r * 7);
    for (const [i, [a, b]] of pairs.entries()) {
      const h = r % 2 ? slSlugs[b] : slSlugs[a];
      const aw = r % 2 ? slSlugs[a] : slSlugs[b];
      const [m] = await db
        .insert(s.matches)
        .values({
          seasonId: slSeason.id,
          stage: "LEAGUE",
          round: `Round ${r + 1}`,
          matchday: r + 1,
          homeTeamId: T[h].id,
          awayTeamId: T[aw].id,
          kickoff: eat(date, ["14:00", "15:15", "16:30", "17:45"][i]),
          venueId: campus.id,
          refereeId: referees[(r + i) % 3].id,
        })
        .returning();
      if (r < 3) await playMatch(m.id, T[h].id, T[aw].id, strength[h], strength[aw]);
    }
  }
  await db.insert(s.teamApplications).values([
    { teamName: "Kansanga Alumni XI", contactName: "Ismail Kiggundu", email: "kansanga.alumni@example.com", phone: "+256 700 000 111", campus: "Kampala International University", affiliation: "ALUMNI", squadSize: 20, message: "We would like to enter the 2027 Super League." },
    { teamName: "Kyambogo Engineers", contactName: "Derrick Waiswa", email: "kyu.engineers@example.com", phone: "+256 700 000 222", campus: "Kyambogo University", affiliation: "STUDENT", squadSize: 22 },
  ]);

  /* ---------- Honours (previous champions) ---------- */
  await db.insert(s.honours).values([
    { competitionId: league.id, seasonName: "Season 3", year: 2025, champion: "La Masia", runnerUp: "Alhilal", topScorer: "Kassim Ssebaggala (La Masia) · 19 goals" },
    { competitionId: league.id, seasonName: "Season 2", year: 2024, champion: "Alhilal", runnerUp: "Los Blancos", topScorer: "Hamza Mayanja (Alhilal) · 17 goals" },
    { competitionId: league.id, seasonName: "Season 1", year: 2023, champion: "Ahal Sunnah", runnerUp: "Alnasr", topScorer: "Yusuf Katende (Ahal Sunnah) · 14 goals" },
    { competitionId: champions.id, seasonName: "2025 Edition", year: 2025, champion: "Los Blancos", runnerUp: "Alnasr", topScorer: "Ivan Kyeyune (Los Blancos) · 8 goals", note: "Won 4-3 on penalties after a 2-2 draw" },
    { competitionId: champions.id, seasonName: "2024 Edition", year: 2024, champion: "Alhilal", runnerUp: "La Masia", topScorer: "Shafik Lubega (Alhilal) · 7 goals" },
    { competitionId: superLeague.id, seasonName: "2025 Season", year: 2025, champion: "Alnasr", runnerUp: "Ahal Sunnah", topScorer: "Arafat Nakibinge (Alnasr) · 9 goals" },
    { competitionId: superLeague.id, seasonName: "2024 Season", year: 2024, champion: "La Masia", runnerUp: "Albayan", topScorer: "Collins Matovu (La Masia) · 7 goals" },
  ]);

  /* ---------- Rules ---------- */
  await db.insert(s.rules).values([
    { competitionId: null, order: 1, title: "Eligibility", body: "Every registered player must be a current student or an alumnus of a recognised university or institute. Each club may register up to 25 players per season; registrations are approved by the BOSA League office before a player is eligible." },
    { competitionId: null, order: 2, title: "Match format", body: "Matches are played over two halves of 40 minutes with a 10-minute interval. Up to five substitutions may be made in three windows, plus half-time." },
    { competitionId: null, order: 3, title: "Discipline", body: "A straight red card carries an automatic one-match suspension. Three accumulated yellow cards in the same competition carry a one-match suspension. Serious misconduct is reviewed by the disciplinary panel." },
    { competitionId: league.id, order: 1, title: "Points and ranking", body: "Three points for a win, one for a draw and none for a defeat. Teams level on points are separated by goal difference, then goals scored, then head-to-head results." },
    { competitionId: league.id, order: 2, title: "Fixtures", body: "The League is a double round-robin of 26 matchdays. All matches are staged at Henry's Pitch, Kabalagala, behind Shell Kabalagala, unless the League office announces otherwise." },
    { competitionId: champions.id, order: 1, title: "Group stage", body: "Fourteen clubs are drawn into two groups of four and two groups of three. The top two sides in each group qualify for the quarter-finals." },
    { competitionId: champions.id, order: 2, title: "Knockout rounds", body: "Quarter-finals, semi-finals and the final are single-leg ties. Level matches go straight to a penalty shoot-out, with no extra time." },
    { competitionId: superLeague.id, order: 1, title: "Squad composition", body: "Matchday squads of eighteen must include at least six registered students. Up to eight alumni may be named." },
    { competitionId: superLeague.id, order: 2, title: "Format", body: "The Super League is a single round-robin. The side with the most points after seven rounds is crowned champion." },
  ]);

  /* ---------- News ---------- */
  const lgMatches = await db.query.matches.findMany({
    where: (m, { eq, and, lte }) => and(eq(m.seasonId, lgSeason.id), lte(m.matchday, 4)),
    with: { homeTeam: true, awayTeam: true },
  });
  const md4 = lgMatches.filter((m) => m.matchday === 4);
  const biggest = [...md4].sort((a, b) => b.homeScore! + b.awayScore! - (a.homeScore! + a.awayScore!))[0];
  const lgTable = computeStandings(teamRows.map((t) => t.id), lgMatches);
  const leader = teamRows.find((t) => t.id === lgTable[0].teamId)!;
  const second = teamRows.find((t) => t.id === lgTable[1].teamId)!;

  const now = new Date("2026-09-24T09:00:00+03:00");
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000);
  await db.insert(s.articles).values([
    {
      slug: "matchday-5-preview-alhilal-ittihad",
      title: "Matchday 5 preview: seven fixtures, one long Sunday at Henry's Pitch",
      excerpt: "From Dream Cast against SC M19 at ten in the morning to Golden Jubilee and HBM under the four o'clock sun, here is everything you need for Sunday 27 September.",
      body: `Sunday belongs to Kabalagala again. Seven matches, seven hours, fourteen clubs, and a table that is already beginning to take shape after four rounds.\n\nThe day opens at 10:00 with Dream Cast against SC M19, a meeting of two sides who both like the ball and both hate giving it back. Karegular follow against Albayan at 11:00, before Alnasr host Osasuna at midday.\n\nThe headline act arrives at 13:00. Alhilal, champions two seasons ago, meet an Ittihad side that has quietly become the most organised defensive unit in the division. Expect a crowd three deep along the touchline behind Shell Kabalagala.\n\nElites face La Masia at 14:00, Ahal Sunnah and Los Blancos renew one of the fiercest rivalries in the competition at 15:00, and Golden Jubilee close the day against HBM at 16:00.\n\n${leader.name} arrive at the top of the table, with ${second.name} close behind. With 22 matchdays still to play nothing is decided, but Sunday will tell us who has the legs for a long season.`,
      category: "COMPETITION",
      featured: true,
      competitionId: league.id,
      publishedAt: ago(3),
      readMinutes: 4,
      authorName: "BOSA Newsroom",
    },
    {
      slug: "matchday-4-report",
      title: `${biggest.homeTeam!.name} ${biggest.homeScore}-${biggest.awayScore} ${biggest.awayTeam!.name}: the pick of Matchday 4`,
      excerpt: `The goals kept coming at Henry's Pitch as ${biggest.homeTeam!.name} and ${biggest.awayTeam!.name} produced the most entertaining ninety minutes of the weekend.`,
      body: `There are matches you watch and matches you remember. ${biggest.homeTeam!.name} against ${biggest.awayTeam!.name} was the second kind.\n\nThe first half was played at a pace that left both benches on their feet, and the second somehow went faster. By the time the referee blew for full time the scoreboard read ${biggest.homeScore}-${biggest.awayScore} and the crowd behind Shell Kabalagala had lost their voices.\n\nElsewhere on Matchday 4, ${leader.name} continued their strong start to Season 4 and now sit top of the table. The full results, scorers and statistics are available in the Match Centre.`,
      category: "MATCH_REPORT",
      featured: false,
      competitionId: league.id,
      publishedAt: ago(90),
      readMinutes: 3,
      authorName: "BOSA Newsroom",
    },
    {
      slug: "champions-league-semi-finals-set",
      title: "Champions League semi-finals set after a dramatic quarter-final week",
      excerpt: "Four clubs remain. The semi-finals will be played on Wednesday 7 October, with the final pencilled in for 21 October at Henry's Pitch.",
      body: `Two nights, four ties and at least one penalty shoot-out that nobody who was there will forget. The BOSA Champions League quarter-finals delivered exactly what the midweek competition has become known for.\n\nThe semi-finals will be played back-to-back on Wednesday 7 October, kicking off at 17:30 and 19:15. The final follows on 21 October.\n\nThe interactive bracket on the Champions League page updates automatically as results come in.`,
      category: "COMPETITION",
      featured: true,
      competitionId: champions.id,
      publishedAt: ago(14),
      readMinutes: 2,
      authorName: "BOSA Newsroom",
    },
    {
      slug: "membership-launch",
      title: "BOSA League membership is here: one payment, the whole season",
      excerpt: "A single payment of UGX 10,000 unlocks full match reports, player profiles, the Match Centre and every members-only story for students and alumni.",
      body: `From today, supporters can become BOSA League members for a one-time payment of UGX 10,000.\n\nMembership unlocks the full Match Centre, including line-ups, event timelines and player-of-the-match awards; complete player profiles and statistics; and members-only editorial from the BOSA Newsroom.\n\nPayment is processed securely through Pesapal and supports MTN Mobile Money, Airtel Money, Visa and Mastercard. Your membership activates the moment your payment is confirmed.\n\nEvery shilling goes back into the competition: referees, pitch hire, medical cover and the trophies that make it all worth it.`,
      category: "ANNOUNCEMENT",
      featured: false,
      publishedAt: ago(40),
      readMinutes: 2,
      authorName: "League Office",
    },
    {
      slug: "super-league-2027-registration-open",
      title: "Super League 2027: registration now open for student and alumni sides",
      excerpt: "Sides that meet the BOSA eligibility rules can apply before 30 November 2026. Here is how the process works.",
      body: `The BOSA Super League is expanding. Registration for the 2027 season is open to university sides that can field a mix of current students and alumni.\n\nClubs must submit a squad of between eighteen and twenty-five players, a named team manager and proof of each player's student or alumni status. Applications are reviewed by the Competitions Desk within fourteen days.\n\nApply through the registration form on the Super League page.`,
      category: "ANNOUNCEMENT",
      featured: false,
      competitionId: superLeague.id,
      publishedAt: ago(70),
      readMinutes: 2,
      authorName: "Competitions Desk",
    },
    {
      slug: "interview-alhilal-captain",
      title: "\"We play for the badge and for the people who wore it before us\"",
      excerpt: "Alhilal's captain on leadership, the weight of history, and why Matchday 5 against Ittihad matters more than most.",
      body: `Few players carry a club the way Alhilal's number ten does. We sat down with him on the eve of Matchday 5.\n\nOn leadership: "The younger boys are still students. Some of us have graduated and come back. My job is to make both feel like the same team."\n\nOn Ittihad: "They do not give you anything. You have to be patient and you have to be brave with the ball."\n\nOn the title: "It is September. Ask me in February."`,
      category: "INTERVIEW",
      featured: false,
      membersOnly: true,
      teamId: T["alhilal"].id,
      competitionId: league.id,
      publishedAt: ago(28),
      readMinutes: 5,
      authorName: "BOSA Newsroom",
    },
    {
      slug: "editorial-henrys-pitch",
      title: "The theatre behind Shell Kabalagala",
      excerpt: "How a patch of grass on the edge of Kabalagala became the most important stage in university football.",
      body: `Arrive early on a BOSA Sunday and you will see it happen. Plastic chairs appear from nowhere. Vendors take their places. Alumni in suits stand shoulder to shoulder with first-years in club scarves.\n\nHenry's Pitch is not a stadium. It has no grandstand and no press box. But for fourteen clubs and the thousands who follow them, it is the only ground that matters.\n\nThis is a story about the pitch, and about the people who made it a home.`,
      category: "EDITORIAL",
      featured: false,
      membersOnly: true,
      publishedAt: ago(120),
      readMinutes: 6,
      authorName: "BOSA Newsroom",
    },
    {
      slug: "registration-window-transfers",
      title: "Registration window: three new players await approval",
      excerpt: "Elites, Osasuna and Karegular have lodged late registrations ahead of Matchday 5. The League office will confirm eligibility before Sunday.",
      body: `Three clubs have used the September registration window to strengthen their squads. Elites have registered a first-year midfielder, Osasuna an alumni forward, and Karegular a second goalkeeper.\n\nAll three registrations are subject to verification of student or alumni status. Approved players will appear in the Player Directory immediately.`,
      category: "TRANSFER",
      featured: false,
      competitionId: league.id,
      publishedAt: ago(52),
      readMinutes: 2,
      authorName: "League Office",
    },
    {
      slug: "referees-appointed-matchday-5",
      title: "Match officials appointed for Matchday 5",
      excerpt: "Three FUFA-certified referees will share the seven fixtures on Sunday 27 September.",
      body: `The League office has confirmed the officiating team for Matchday 5. Referees Hakim Ssali, Joseph Kawooya and Umar Nsereko will rotate across the seven fixtures, with assistant referees drawn from the BOSA officials pool.\n\nClubs are reminded that team sheets must be submitted thirty minutes before kick-off.`,
      category: "ANNOUNCEMENT",
      featured: false,
      competitionId: league.id,
      publishedAt: ago(20),
      readMinutes: 1,
      authorName: "League Office",
    },
  ]);

  await db.insert(s.activityLogs).values([
    { userId: admin.id, action: "Published fixtures", entity: "Season", entityId: lgSeason.id, details: "Matchday 5 fixtures published for 27 Sept 2026", createdAt: ago(30) },
    { userId: admin.id, action: "Recorded result", entity: "Match", details: "Matchday 4 results confirmed", createdAt: ago(88) },
    { userId: admin.id, action: "Published article", entity: "Article", details: "Matchday 5 preview", createdAt: ago(3) },
  ]);

  console.log(`Seeded ${teamRows.length} teams, ${playerRows.length + 3} players, ${fixtures.length} league fixtures.`);
  console.log("Login with superadmin@bosaleague.com / Bosa@2026");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
