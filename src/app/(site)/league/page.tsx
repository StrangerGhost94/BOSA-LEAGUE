import { notFound } from "next/navigation";
import { CompetitionHero, HonoursList, LeaderBoard, MatchdayNav, SubNav, TeamGoalsChart } from "@/components/competition";
import { FixtureRow, StandingsTable } from "@/components/match";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { SectionHeading, StatTile } from "@/components/ui";
import { getCompetition, getHonours, getMatches, getPlayerStats, getSeasonTable, getSeasonTotals, getTeams, visibleTo } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { MembersLock } from "@/components/members-lock";
import { fmtLong } from "@/lib/format";
import { CL_PLACES, getSeasonState } from "@/lib/season-engine";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as sc from "@/db/schema";
import Link from "next/link";

export const metadata = { title: "BOSA League" };

export default async function LeaguePage({ searchParams }: { searchParams: { md?: string; season?: string } }) {
  const c = await getCompetition("bosa-league");
  if (!c?.season) notFound();
  const seasons = await db.query.seasons.findMany({ where: eq(sc.seasons.competitionId, c.comp.id), orderBy: [desc(sc.seasons.year), desc(sc.seasons.createdAt)] });
  const picked = searchParams.season ? await db.query.seasons.findFirst({ where: and(eq(sc.seasons.id, searchParams.season), eq(sc.seasons.competitionId, c.comp.id)) }) : null;
  const season = picked ?? c.season;
  const isCurrent = season.id === c.season.id;
  const state = await getSeasonState();
  const finished = !isCurrent || (state.phase !== "LEAGUE" && state.phase !== "PRESEASON");
  const qs = isCurrent ? "" : `season=${season.id}`;
  const user = await getCurrentUser();
  const member = hasMembership(user);
  const [table, totals, allMatches, stats, honours, teams] = await Promise.all([
    getSeasonTable(season.id),
    getSeasonTotals(season.id),
    getMatches({ seasonId: season.id }),
    getPlayerStats({ seasonId: season.id }),
    getHonours(c.comp.id),
    getTeams(),
  ]);
  const all = allMatches;
  const totalMd = Math.max(1, ...all.map((m) => m.matchday ?? 0));
  const playedMd = Math.max(0, ...all.filter((m) => m.status === "FULL_TIME").map((m) => m.matchday ?? 0));
  const nextMd = all.find((m) => m.status !== "FULL_TIME")?.matchday ?? totalMd;
  const md = Math.min(totalMd, Math.max(1, parseInt(searchParams.md ?? "", 10) || nextMd));
  const mdAll = all.filter((m) => m.matchday === md);
  const mdMatches = visibleTo(mdAll, member);
  const lockedUntil = mdAll.length > mdMatches.length ? mdAll.find((m) => m.publicFrom)?.publicFrom ?? null : null;

  const scorers = stats.filter((p) => p.goals > 0).slice(0, 6);
  const assists = [...stats].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 6);
  const keepers = [...stats].filter((p) => p.position === "GK" && p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets).slice(0, 6);
  const potm = [...stats].filter((p) => p.potm > 0).sort((a, b) => b.potm - a.potm).slice(0, 6);
  const bestAttack = [...table].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefence = [...table].filter((r) => r.played).sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];

  return (
    <>
      <CompetitionHero
        type="LEAGUE"
        name="BOSA League"
        season={`${season.name} · ${season.year}`}
        tagline={c.comp.tagline}
        description={c.comp.description}
        stats={[
          { label: "Clubs", value: table.length },
          { label: "Matches played", value: totals.played },
          { label: "Goals", value: totals.goals },
          { label: "Matchdays", value: totalMd },
        ]}
      />
      <SubNav items={[{ href: "#table", label: "Standings" }, { href: "#fixtures", label: "Fixtures & Results" }, { href: "#stats", label: "Statistics" }, { href: "#history", label: "Champions" }]} />

      <section id="table" className="container-x scroll-mt-40 pt-14 sm:pt-20">
        {seasons.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {seasons.map((x) => (
              <Link key={x.id} href={x.id === c.season!.id ? "/league#table" : `/league?season=${x.id}#table`} scroll={false} className={x.id === season.id ? "chip border-gold/40 bg-gold/10 text-gold" : "chip text-ivory/60 hover:text-gold"}>
                {x.name} · {x.year}
              </Link>
            ))}
          </div>
        )}
        {finished && season.championId && (
          <FadeIn className="mb-8">
            <div className="panel flex flex-wrap items-center gap-4 border-gold/30 p-5">
              <span className="eyebrow">{season.name} champions</span>
              <span className="font-serif text-2xl">{teams.find((t) => t.id === season.championId)?.name}</span>
              <span className="text-sm text-ivory/55">{isCurrent && state.phase === "CHAMPIONS" ? `The top ${CL_PLACES} are now in the Champions League knock-out.` : ""}</span>
            </div>
          </FadeIn>
        )}
        <SectionHeading eyebrow={finished ? "Final table" : "Updated automatically after every result"} title={<>League <em className="gold-text">standings</em></>} />
        <FadeIn>
          <div className="panel p-2 sm:p-4">
            <StandingsTable rows={table} qualify={CL_PLACES} />
          </div>
          <div className="mt-4 flex flex-wrap gap-5 text-xs text-ivory/45">
            <span className="flex items-center gap-2"><span className="h-3 w-[3px] rounded bg-gold" /> Title position</span>
            <span className="flex items-center gap-2"><span className="h-3 w-[3px] rounded bg-emerald" /> Top {CL_PLACES}: Champions League</span>
            <span>Three points for a win, one for a draw. Tie-breakers: goal difference, goals scored, head-to-head.</span>
          </div>
        </FadeIn>
      </section>

      <section id="fixtures" className="container-x scroll-mt-40 pt-14 sm:pt-24">
        <SectionHeading eyebrow={mdMatches[0] ? fmtLong(mdMatches[0].kickoff) : "Matchweek"} title={<>Matchday <em className="gold-text">{md}</em></>} />
        <MatchdayNav base={qs ? `/league?${qs}` : "/league"} current={md} total={totalMd} played={playedMd} />
        {lockedUntil && (
          <div className="mt-6">
            <MembersLock
              title={`Matchday ${md}: members see it first`}
              body={`The Matchday ${md} fixtures are in early access for members. They open to everyone on ${fmtLong(lockedUntil)}.`}
              signedIn={!!user}
            />
          </div>
        )}
        <Stagger className="panel mt-6 p-2 sm:p-3">
          {mdMatches.map((m) => (
            <StaggerItem key={m.id}>
              <FixtureRow m={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section id="stats" className="container-x scroll-mt-40 pt-14 sm:pt-24">
        <SectionHeading eyebrow="Season in numbers" title={<>Competition <em className="gold-text">statistics</em></>} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Goals per match" hint={`${totals.goals} goals in ${totals.played} matches`}>{totals.played ? (totals.goals / totals.played).toFixed(2) : "0.00"}</StatTile>
          <StatTile label="Best attack" hint={bestAttack ? `${bestAttack.team.name}` : ""} accent="crimson">{bestAttack?.goalsFor ?? 0}</StatTile>
          <StatTile label="Best defence" hint={bestDefence ? `${bestDefence.team.name} conceded` : ""} accent="emerald">{bestDefence?.goalsAgainst ?? 0}</StatTile>
          <StatTile label="Cards" hint={`${totals.yellows} yellow · ${totals.reds} red`}>{totals.yellows + totals.reds}</StatTile>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <LeaderBoard title="Top scorers" players={scorers} stat="goals" unit="goals" />
          <LeaderBoard title="Most assists" players={assists} stat="assists" unit="assists" />
          <LeaderBoard title="Clean sheets" players={keepers} stat="cleanSheets" unit="clean sheets" />
          <LeaderBoard title="Player of the match" players={potm} stat="potm" unit="awards" />
        </div>
        <div className="mt-6">
          <TeamGoalsChart rows={table} />
        </div>
      </section>

      <section id="history" className="container-x scroll-mt-40 pt-14 sm:pt-24">
        <SectionHeading eyebrow="Roll of honour" title={<>Champion <em className="gold-text">history</em></>} />
        <HonoursList honours={honours} teams={teams} />
      </section>
    </>
  );
}
