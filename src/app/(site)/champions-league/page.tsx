import { notFound } from "next/navigation";
import { CompetitionHero, HonoursList, LeaderBoard, SubNav } from "@/components/competition";
import { MatchCard, StandingsTable } from "@/components/match";
import { Bracket } from "@/components/bracket";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, SectionHeading } from "@/components/ui";
import { getCompetition, getGroupTables, getHonours, getMatches, getPlayerStats, getSeasonTotals, getTeams, visibleTo } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { toBracket } from "@/lib/bracket-data";
import { getSeasonTable } from "@/lib/data";
import { CL_PLACES, getSeasonState } from "@/lib/season-engine";

export const metadata = { title: "BOSA Champions League" };

export default async function ChampionsLeaguePage() {
  const c = await getCompetition("champions-league");
  if (!c?.season) notFound();
  const season = c.season;
  const [groups, all, stats, honours, teams, totals] = await Promise.all([
    getGroupTables(season.id),
    getMatches({ seasonId: season.id }),
    getPlayerStats({ seasonId: season.id }),
    getHonours(c.comp.id),
    getTeams(),
    getSeasonTotals(season.id),
  ]);
  const qf = all.filter((m) => m.stage === "QUARTER_FINAL").map(toBracket);
  const sf = all.filter((m) => m.stage === "SEMI_FINAL").map(toBracket);
  const finalM = all.find((m) => m.stage === "FINAL");
  const member = hasMembership(await getCurrentUser());
  const upcoming = visibleTo(all.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED"), member).slice(0, 6);
  const scorers = stats.filter((p) => p.goals > 0).slice(0, 6);
  const assists = [...stats].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 6);
  const potm = [...stats].filter((p) => p.potm > 0).sort((a, b) => b.potm - a.potm).slice(0, 6);
  const remaining = all.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED").length;
  const state = await getSeasonState();
  // Before the draw: the live race for the top places in the league
  const race = !all.length && state.league ? (await getSeasonTable(state.league.id)).slice(0, CL_PLACES + 2) : [];
  const qualified = all.length ? new Set(all.filter((m) => m.stage === all[0].stage).flatMap((m) => [m.homeTeamId, m.awayTeamId]).filter(Boolean)).size : CL_PLACES;

  return (
    <>
      <CompetitionHero
        type="CHAMPIONS"
        name="Champions League"
        season={`BOSA Champions League · ${season.name}`}
        tagline={c.comp.tagline}
        description={c.comp.description}
        stats={[
          { label: "Clubs qualify", value: qualified },
          { label: "Knock-out rounds", value: qualified >= 8 ? 3 : qualified >= 4 ? 2 : 1 },
          { label: "Goals", value: totals.goals },
          { label: "Matches remaining", value: remaining },
        ]}
      />
      <SubNav items={[{ href: "#bracket", label: "Knockout bracket" }, { href: "#groups", label: groups.length ? "Group stage" : "Qualification" }, { href: "#upcoming", label: "Upcoming" }, { href: "#performers", label: "Best performers" }, { href: "#winners", label: "Previous winners" }]} />

      <section id="bracket" className="container-x scroll-mt-40 pt-20">
        <SectionHeading eyebrow="Hover a club to trace its path" title={<>The road to the <em className="gold-text">final</em></>} />
        <div className="glass rounded-3xl p-6 sm:p-8">
          {qf.length ? <Bracket qf={qf} sf={sf} final={finalM ? toBracket(finalM) : null} championId={season.championId} /> : <EmptyState title="The draw is made when the league ends" body={`The top ${CL_PLACES} in the BOSA League go through, seeded by league position: 1 v 8, 4 v 5, 2 v 7, 3 v 6. The quarter-finals are played the Sunday after the last league matchday.`} />}
        </div>
      </section>

      {!groups.length && race.length > 0 && (
        <section id="groups" className="container-x scroll-mt-40 pt-24">
          <SectionHeading eyebrow={`Top ${CL_PLACES} in the league qualify`} title={<>Race for the <em className="gold-text">top {CL_PLACES}</em></>} action={{ href: "/league#table", label: "Full table" }} />
          <FadeIn>
            <div className="panel p-2 sm:p-4">
              <StandingsTable rows={race} compact qualify={CL_PLACES} />
            </div>
          </FadeIn>
        </section>
      )}
      {groups.length > 0 && <section id="groups" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="Top two advance" title={<>Group <em className="gold-text">stage</em></>} />
        <Stagger className="grid gap-6 lg:grid-cols-2">
          {groups.map((g) => (
            <StaggerItem key={g.id}>
              <div className="panel p-5">
                <div className="mb-2 flex items-center justify-between px-2">
                  <h3 className="font-serif text-2xl">{g.name}</h3>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Qualified</span>
                </div>
                <StandingsTable rows={g.rows} compact zones={false} qualify={2} />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>}

      <section id="upcoming" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="One round each Sunday" title={<>Upcoming <em className="gold-text">matches</em></>} action={{ href: "/fixtures?comp=champions-league", label: "All fixtures" }} />
        {upcoming.length ? (
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((m) => (
              <StaggerItem key={m.id}>
                <MatchCard m={m} showComp={false} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          all.length ? <EmptyState title="Edition complete" body="Every Champions League tie has been played." /> : <EmptyState title="Fixtures follow the league" body="The knock-out ties are scheduled automatically once the last league match is played." />
        )}
      </section>

      <section id="performers" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="This edition" title={<>Best <em className="gold-text">performers</em></>} />
        <div className="grid gap-6 lg:grid-cols-3">
          <LeaderBoard title="Top scorers" players={scorers} stat="goals" unit="goals" />
          <LeaderBoard title="Assists" players={assists} stat="assists" unit="assists" />
          <LeaderBoard title="Player of the match" players={potm} stat="potm" unit="awards" />
        </div>
      </section>

      <section id="winners" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="Roll of honour" title={<>Previous <em className="gold-text">winners</em></>} />
        <FadeIn>
          <HonoursList honours={honours} teams={teams} />
        </FadeIn>
      </section>
    </>
  );
}
