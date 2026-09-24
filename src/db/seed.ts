import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "./schema";
import { TEAMS, OFFICIAL_TABLE, TOP_SCORERS, FIXTURES, RESULTS, HISTORY, SQUADS, PLAYER_RENAMES } from "./seed-data";

/**
 * Seeds BOSA League Season 4 with the official data supplied by the League office:
 * the table after Matchday 4, the top scorers, and the published fixtures.
 *
 * DATA_VERSION lets a deployment replace older demo data exactly once.
 */
const DATA_VERSION = "9";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });
const eat = (date: string, time: string) => new Date(`${date}T${time}:00+03:00`);
const ELIGIBILITY = "BOSA League is for old students of Bilal Islamic Institute. Each club is made up of the old students who joined the Institute in the same year, so players register with the year they joined and play for that year's club. Every player must be approved by the League office before they are eligible to play.";
const CL_TAGLINE = "The top eight. Three Sundays.";
const CL_DESC = "When the league ends, the top eight clubs in the BOSA League go into a knock-out: quarter-finals, semi-finals and a final, one round each Sunday. Draws are seeded by league position.";
const CL_RULE = "The top eight clubs in the final BOSA League table qualify. Ties are single matches seeded by league position (1 v 8, 4 v 5, 2 v 7, 3 v 6). A level tie goes straight to penalties.";
const SEASON_RULE = "Each season opens with the Super Cup. League Matchday 1 is the following Sunday, and every club plays every other club once. After the league, the top eight play the Champions League. Clubs that join during a season start from the next season. If a club withdraws during the league, all its results are removed and its remaining fixtures cancelled.";
const SUPER_RULE = "The Super Cup is a single match that opens each season, played between the previous season's BOSA League champion and the previous season's BOSA Champions League winner.";

const MEMBERSHIP_TITLE = "BOSA League membership: one voucher, the whole season";
const MEMBERSHIP_EXCERPT = "Buy a one-time membership voucher, enter the code when you sign up, and everything opens up.";
const MEMBERSHIP_BODY =
  "Old students of Bilal Islamic Institute can now become BOSA League members with a one-time membership voucher.\n\nBuy a voucher from the League office or a club manager at Henry's Pitch. Each voucher carries a code like BOSA-7KQ4-M9XT. Enter it when you create your account, or on the Membership page if you already have one, and your membership starts straight away.\n\nMembership unlocks the live match centre, your digital member card with partner perks, fans' votes, members-only photos and highlights, and early access to fixtures. Each voucher works once.";

/** "kiggundu huzaifa" -> "Kiggundu Huzaifa"; names already mixed-case (AbduSalaam) are kept as written. */
function tidyName(n: string) {
  return n
    .trim()
    .split(/\s+/)
    .map((w) => (w === w.toLowerCase() || w === w.toUpperCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/**
 * Loads the clubs' squad sheets: coach and captain on the club, every player as an approved squad member.
 * Players already on record with the same name (e.g. from the top scorers list) are updated, not duplicated,
 * so their goals stay with them. Safe to run more than once.
 */
async function applySquads() {
  for (const [slug, oldName, newName] of PLAYER_RENAMES) {
    const [first, ...rest] = newName.split(" ");
    await pool.query(
      "update players set first_name=$3, last_name=$4 where team_id=(select id from teams where slug=$1) and trim(first_name||' '||last_name)=$2",
      [slug, oldName, first, rest.join(" ")],
    );
  }
  for (const sq of SQUADS) {
    const { rows: tr } = await pool.query("select id, name, intake_year from teams where slug=$1", [sq.slug]);
    if (!tr.length) continue;
    const team = tr[0];
    await pool.query("update teams set coach_name=$2, captain_name=coalesce($3, captain_name) where id=$1", [team.id, sq.coach, sq.captain ?? null]);
    if (sq.assistant) await pool.query("update teams set bio=$2 where id=$1 and (bio is null or bio='')", [team.id, `Manager: ${sq.coach}. Assistant manager: ${sq.assistant}.${sq.captain ? ` Captain: ${sq.captain}.` : ""}`]);
    // The club's manager login carries the manager's real name instead of "<Club> Manager"
    await pool.query("update users set name=$2 where team_id=$1 and role='TEAM_MANAGER' and name=$3", [team.id, sq.coach, `${team.name} Manager`]);

    const { rows: existing } = await pool.query("select id, lower(trim(first_name||' '||last_name)) full_name from players where team_id=$1", [team.id]);
    // Name -> ids already on record (a list, because two players can share a name, e.g. two "Hamza")
    const before = new Map<string, string[]>();
    for (const r of existing as { id: string; full_name: string }[]) before.set(r.full_name, [...(before.get(r.full_name) ?? []), r.id]);
    for (const line of sq.players) {
      const [rawName, pos, shirt] = line.split("|");
      const name = tidyName(rawName);
      const [first, ...rest] = name.split(" ");
      const position = pos || null;
      const number = shirt ? Number(shirt) : 0;
      const key = name.toLowerCase();
      const match = before.get(key)?.shift();
      if (match) {
        await pool.query(
          "update players set position=coalesce($2::\"position\", position), number=case when $3>0 then $3 else number end, status='ACTIVE', completion_year=coalesce(completion_year,$4) where id=$1",
          [match, position, number, team.intake_year],
        );
        continue;
      }
      await pool.query(
        "insert into players (id, team_id, first_name, last_name, number, position, affiliation, status, completion_year) values (gen_random_uuid()::text, $1, $2, $3, $4, $5::\"position\", 'ALUMNI', 'ACTIVE', $6)",
        [team.id, first, rest.join(" "), number, position, team.intake_year],
      );
    }
  }
  console.log(`Loaded squad sheets for ${SQUADS.length} clubs.`);
}

/** Demo supporter accounts and demo payments were only for testing before launch. Staff accounts stay. */
async function removeDemoData() {
  await pool.query("delete from payments where provider='DEMO'");
  await pool.query("delete from users where email in ('fan@bosaleague.com','alumni@bosaleague.com')");
}

/** The first 1,000 membership vouchers, created once. */
async function launchVouchers() {
  const { rows } = await pool.query("select count(*)::int c from vouchers");
  if (rows[0].c > 0) return;
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const { randomInt } = await import("crypto");
  const codes = new Set<string>();
  while (codes.size < 1000) {
    let x = "";
    for (let i = 0; i < 8; i++) x += ALPHABET[randomInt(ALPHABET.length)];
    codes.add(`BOSA-${x.slice(0, 4)}-${x.slice(4)}`);
  }
  await pool.query("insert into vouchers (id, code, batch) select gen_random_uuid()::text, c, 'Launch batch' from unnest($1::text[]) c on conflict do nothing", [[...codes]]);
  console.log("Created 1,000 membership vouchers (Launch batch).");
}

/** Rules describing the automatic season calendar. Safe to run more than once. */
async function addCalendarRules() {
  await pool.query(
    "insert into rules (id, competition_id, title, body, \"order\") select gen_random_uuid()::text, id, 'Who qualifies', $1, 1 from competitions where slug='champions-league' and not exists (select 1 from rules r where r.title='Who qualifies')",
    [CL_RULE],
  );
  await pool.query(
    "insert into rules (id, competition_id, title, body, \"order\") select gen_random_uuid()::text, null, 'The season calendar', $1, 3 where not exists (select 1 from rules r where r.title='The season calendar')",
    [SEASON_RULE],
  );
}

/** Adds past champions to the roll of honour. Safe to run more than once. */
async function applyHistory() {
  for (const h of HISTORY) {
    await pool.query(
      `insert into honours (id, competition_id, season_name, year, champion, runner_up, note)
       select gen_random_uuid()::text, c.id, $2, $3, $4, $5, $6 from competitions c
       where c.slug=$1 and not exists (select 1 from honours x where x.competition_id=c.id and x.year=$3)`,
      [h.comp, h.season, h.year, h.champion, h.runnerUp, h.note],
    );
  }
  // The 2026 Super Cup has been played: record its winner on the current season
  await pool.query(
    `update seasons set champion_id=(select id from teams where slug='golden-jubilee')
     where champion_id is null and year=2026 and competition_id=(select id from competitions where slug='super-cup')`,
  );
}

async function main() {
  const existing = await db.select().from(s.teams).limit(1);
  if (existing.length) {
    const v = await pool.query("select value from settings where key='data_version'");
    if (v.rows[0]?.value === "2" && !process.argv.includes("--force")) {
      // Non-destructive update from version 2: reword text for Bilal Institute old students; keeps all results and accounts.
      await pool.query("update competitions set description=$1 where slug='bosa-league'", ["The flagship competition. Fourteen clubs of Bilal Islamic Institute old students meet every Sunday at Henry's Pitch, Kabalagala, behind Shell Kabalagala. Three points for a win, one for a draw."]);
      await pool.query("update competitions set tagline=$1, description=$2 where slug='super-league'", ["Another stage for old students.", "A separate competition for sides of Bilal Institute old students. Fixtures and standings appear here once the League office publishes them."]);
      await pool.query("update seasons set registration_note=$1 where registration_note like 'Student and alumni%'", ["Sides made up of Bilal Institute old students can apply to enter. The Competitions Desk reviews every application and will contact you."]);
      await pool.query("update rules set body=$1 where title='Eligibility'", ["BOSA League is for old students of Bilal Islamic Institute. Players register with the year they completed at the Institute, and must be approved by the League office before they are eligible to play."]);
      await pool.query("update users set role='ALUMNI_FAN', name='Demo Old Student' where email='fan@bosaleague.com' and name='Demo Student Fan'");
      await pool.query("update users set name='Demo Old Student (no membership)' where email='alumni@bosaleague.com' and name='Demo Alumni Fan'");
      v.rows[0].value = "3";
    }
    if (v.rows[0]?.value === "3" && !process.argv.includes("--force")) {
      // Non-destructive update from version 3: the Super League is one season-opening match, not a registration league.
      await pool.query("update competitions set tagline=$1, description=$2 where slug='super-league'", ["The match that opens every season.", "One match opens every season: last season's BOSA League champion against last season's BOSA Champions League winner."]);
      await pool.query("update seasons set name='Season 4', registration_open=false, registration_note=null where competition_id=(select id from competitions where slug='super-league') and year=2026");
      await pool.query("delete from season_teams where season_id in (select s.id from seasons s join competitions c on c.id=s.competition_id where c.slug='super-league')");
      await pool.query(
        "insert into rules (id, competition_id, title, body, \"order\") select gen_random_uuid()::text, id, 'Who plays', $1, 1 from competitions where slug='super-league' and not exists (select 1 from rules r where r.title='Who plays')",
        ["The Super League is a single match that opens each season, played between the previous season's BOSA League champion and the previous season's BOSA Champions League winner."],
      );
      v.rows[0].value = "4";
    }
    if (v.rows[0]?.value === "4" && !process.argv.includes("--force")) {
      // Non-destructive update from version 4: the Super League is renamed the Super Cup, and past champions are added.
      await pool.query("update competitions set slug='super-cup', name='BOSA Super Cup', short_name='Super Cup' where slug='super-league'");
      await pool.query("update rules set body=$1 where title='Who plays'", [SUPER_RULE]);
      await pool.query("update matches set round='Super Cup' where round='Super League'");
      await applyHistory();
      v.rows[0].value = "5";
    }
    if (v.rows[0]?.value === "5" && !process.argv.includes("--force")) {
      // Non-destructive update from version 5: Champions League is the top-eight knock-out, and the season calendar rules.
      await pool.query("update competitions set tagline=$1, description=$2 where slug='champions-league'", [CL_TAGLINE, CL_DESC]);
      await addCalendarRules();
      v.rows[0].value = "6";
    }
    if (v.rows[0]?.value === "6" && !process.argv.includes("--force")) {
      // Non-destructive update from version 6: each club is the intake of old students who joined Bilal Institute in one year.
      for (const t of TEAMS) await pool.query("update teams set intake_year=$2 where slug=$1 and intake_year is null", [t.slug, t.intake]);
      await pool.query("update rules set body=$1 where title='Eligibility'", [ELIGIBILITY]);
      v.rows[0].value = "7";
    }
    if (v.rows[0]?.value === "7" && !process.argv.includes("--force")) {
      // Non-destructive update from version 7: memberships are sold as one-time vouchers; demo payments and demo supporter accounts go.
      await removeDemoData();
      await launchVouchers();
      await pool.query("update articles set title=$2, excerpt=$3, body=$4 where slug=$1", ["membership-launch", MEMBERSHIP_TITLE, MEMBERSHIP_EXCERPT, MEMBERSHIP_BODY]);
      v.rows[0].value = "8";
    }
    if (v.rows[0]?.value === "8" && !process.argv.includes("--force")) {
      // Non-destructive update from version 8: official squad sheets for five clubs
      await applySquads();
      await pool.query("insert into settings (key, value) values ('data_version', $1) on conflict (key) do update set value=excluded.value", [DATA_VERSION]);
      console.log("Updated data to version " + DATA_VERSION + " (no results or accounts removed).");
      await pool.end();
      return;
    }
    if (v.rows[0]?.value === DATA_VERSION && !process.argv.includes("--force")) {
      console.log("Database already seeded (data version " + DATA_VERSION + "). Nothing to do.");
      await pool.end();
      return;
    }
    console.log("Replacing earlier demo data with the official Season 4 data...");
    const { rows } = await pool.query("select tablename from pg_tables where schemaname='public'");
    const tables = rows.map((r: { tablename: string }) => `"${r.tablename}"`).join(", ");
    if (tables) await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  }

  console.log("Seeding BOSA League Season 4...");
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || "Bosa@2026", 10);

  await db.insert(s.settings).values([
    { key: "membership_price", value: "10000" },
    { key: "membership_currency", value: "UGX" },
    { key: "data_version", value: DATA_VERSION },
  ]);

  const [henrys] = await db
    .insert(s.venues)
    .values([{ name: "Henry's Pitch", area: "Kabalagala", address: "Behind Shell Kabalagala, Kampala" }])
    .returning();

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
        campus: "",
        founded: 2023,
        intakeYear: t.intake,
        homeVenue: "Henry's Pitch, Kabalagala",
      })),
    )
    .returning();
  const T = Object.fromEntries(teamRows.map((t) => [t.slug, t]));

  /* ---------- Accounts (change these passwords after first sign-in) ---------- */
  await db.insert(s.users).values([
    { name: "BOSA Super Admin", email: "superadmin@bosaleague.com", passwordHash, role: "SUPER_ADMIN", membership: "ACTIVE" },
    { name: "League Administrator", email: "admin@bosaleague.com", passwordHash, role: "LEAGUE_ADMIN", membership: "ACTIVE" },
    { name: "Competitions Desk", email: "competitions@bosaleague.com", passwordHash, role: "COMPETITION_MANAGER", membership: "ACTIVE" },
    { name: "Referee One", email: "referee1@bosaleague.com", passwordHash, role: "REFEREE", membership: "ACTIVE" },
    { name: "Referee Two", email: "referee2@bosaleague.com", passwordHash, role: "REFEREE", membership: "ACTIVE" },
    { name: "Referee Three", email: "referee3@bosaleague.com", passwordHash, role: "REFEREE", membership: "ACTIVE" },
    ...teamRows.map((t) => ({
      name: `${t.name} Manager`,
      email: `coach.${t.slug}@bosaleague.com`,
      passwordHash,
      role: "TEAM_MANAGER" as const,
      membership: "ACTIVE" as const,
      teamId: t.id,
    })),
  ]);

  /* ---------- Competitions ---------- */
  const [league, champions, superLeague] = await db
    .insert(s.competitions)
    .values([
      { slug: "bosa-league", name: "BOSA League", shortName: "League", type: "LEAGUE", order: 1, tagline: "Fourteen clubs. One crown.", description: "The flagship competition. Fourteen clubs of Bilal Islamic Institute old students meet every Sunday at Henry's Pitch, Kabalagala, behind Shell Kabalagala. Three points for a win, one for a draw." },
      { slug: "champions-league", name: "BOSA Champions League", shortName: "Champions League", type: "CHAMPIONS", order: 2, tagline: CL_TAGLINE, description: CL_DESC },
      { slug: "super-cup", name: "BOSA Super Cup", shortName: "Super Cup", type: "SUPER", order: 3, tagline: "The match that opens every season.", description: "One match opens every season: last season's BOSA League champion against last season's BOSA Champions League winner." },
    ])
    .returning();

  const [season] = await db
    .insert(s.seasons)
    .values({ competitionId: league.id, name: "Season 4", year: 2026, isCurrent: true, startsAt: eat("2026-08-30", "10:00") })
    .returning();
  await db.insert(s.seasons).values([
    { competitionId: champions.id, name: "2026 Edition", year: 2026, isCurrent: true },
    { competitionId: superLeague.id, name: "Season 4", year: 2026, isCurrent: true },
  ]);

  // Official table after Matchday 4 is the opening balance; results from Matchday 5 onwards are added on top automatically.
  await db.insert(s.seasonTeams).values(
    OFFICIAL_TABLE.map((r) => ({
      seasonId: season.id,
      teamId: T[r.slug].id,
      basePlayed: r.p,
      baseWon: r.w,
      baseDrawn: r.d,
      baseLost: r.l,
      baseGoalsFor: r.f,
      baseGoalsAgainst: r.a,
      baseForm: r.form,
    })),
  );

  /* ---------- Fixtures ---------- */
  for (const [md, date, list] of FIXTURES) {
    for (const [home, away, time] of list) {
      const key = `${md}:${home}:${away}`;
      const result = RESULTS[key];
      const played = md <= 4;
      await db.insert(s.matches).values({
        seasonId: season.id,
        stage: "LEAGUE",
        round: `Matchday ${md}`,
        matchday: md,
        homeTeamId: T[home].id,
        awayTeamId: T[away].id,
        kickoff: eat(date, time),
        venueId: henrys.id,
        status: played ? "FULL_TIME" : "SCHEDULED",
        homeScore: result ? result[0] : null,
        awayScore: result ? result[1] : null,
        // Matchdays 1-4 are already inside the official table, so they must not be counted twice
        countsInTable: !played,
      });
    }
  }

  /* ---------- Top scorers (goals scored before match-by-match tracking) ---------- */
  await db.insert(s.players).values(
    TOP_SCORERS.map(([first, last, slug, goals]) => ({
      teamId: T[slug].id,
      firstName: first,
      lastName: last,
      number: 0,
      position: "FWD" as const,
      status: "ACTIVE" as const,
      baseGoals: goals,
    })),
  );

  /* ---------- Rules ---------- */
  await db.insert(s.rules).values([
    { competitionId: league.id, order: 1, title: "Points and ranking", body: "Three points for a win, one for a draw and none for a defeat. Teams level on points are separated by goal difference, then goals scored." },
    { competitionId: league.id, order: 2, title: "Venue", body: "BOSA League matches are played at Henry's Pitch, Kabalagala, behind Shell Kabalagala, unless the League office announces otherwise." },
    { competitionId: superLeague.id, order: 1, title: "Who plays", body: SUPER_RULE },
    { competitionId: null, order: 1, title: "Eligibility", body: ELIGIBILITY },
    { competitionId: null, order: 2, title: "Discipline", body: "A red card carries an automatic one-match suspension. Accumulated yellow cards may also lead to a suspension, as set by the League office." },
  ]);

  /* ---------- Past champions ---------- */
  await applyHistory();
  await addCalendarRules();
  await launchVouchers();
  await applySquads();

  /* ---------- News ---------- */
  await db.insert(s.articles).values([
    {
      slug: "matchday-5-preview",
      title: "Matchday 5: Ittihad defend a perfect start",
      excerpt: "Ittihad top the table with four wins from four. Seven matches at Henry's Pitch on Sunday 27 September decide who keeps pace.",
      body: "Four matchdays in, Ittihad are the only side with a perfect record: four wins, thirteen goals scored and twelve points. Albayan are two points behind and still unbeaten, with Golden Jubilee third on eight.\n\nChimutayi Nasur of Ittihad leads the scoring charts with six goals, ahead of Sudaisi Muwonge of La Masia and Tariq Uthuman of HBM on five each.\n\nMatchday 5 kicks off at 10:00 on Sunday 27 September with Dream Cast against SC M19, and ends with Golden Jubilee against HBM at 16:00. The leaders face Alhilal at 13:00.",
      category: "COMPETITION",
      featured: true,
      competitionId: league.id,
      publishedAt: new Date("2026-09-24T09:00:00+03:00"),
      readMinutes: 2,
      authorName: "BOSA Newsroom",
    },
    {
      slug: "membership-launch",
      title: MEMBERSHIP_TITLE,
      excerpt: MEMBERSHIP_EXCERPT,
      body: MEMBERSHIP_BODY,
      category: "ANNOUNCEMENT",
      publishedAt: new Date("2026-09-23T18:00:00+03:00"),
      readMinutes: 1,
      authorName: "League Office",
    },
  ]);

  console.log(`Seeded ${teamRows.length} teams, official table after Matchday 4, ${TOP_SCORERS.length} scorers and ${FIXTURES.reduce((a, f) => a + f[2].length, 0)} fixtures.`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
