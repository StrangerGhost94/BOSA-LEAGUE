import { notFound } from "next/navigation";
import { CompetitionHero, HonoursList, LeaderBoard, SubNav } from "@/components/competition";
import { MatchCard, StandingsTable } from "@/components/match";
import { Bracket } from "@/components/bracket";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, SectionHeading } from "@/components/ui";
import { getCompetition, getGroupTables, getHonours, getMatches, getPlayerStats, getSeasonTotals, getTeams } from "@/lib/data";
import { toBracket } from "@/lib/bracket-data";

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
  const upcoming = all.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED").slice(0, 6);
  const scorers = stats.filter((p) => p.goals > 0).slice(0, 6);
  const assists = [...stats].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 6);
  const potm = [...stats].filter((p) => p.potm > 0).sort((a, b) => b.potm - a.potm).slice(0, 6);
  const remaining = all.filter((m) => m.status !== "FULL_TIME").length;

  return (
    <>
      <CompetitionHero
        type="CHAMPIONS"
        name="Champions League"
        season={`BOSA Champions League · ${season.name}`}
        tagline={c.comp.tagline}
        description={c.comp.description}
        stats={[
          { label: "Clubs", value: teams.length },
          { label: "Groups", value: groups.length },
          { label: "Goals", value: totals.goals },
          { label: "Matches remaining", value: remaining },
        ]}
      />
      <SubNav items={[{ href: "#bracket", label: "Knockout bracket" }, { href: "#groups", label: "Group stage" }, { href: "#upcoming", label: "Upcoming" }, { href: "#performers", label: "Best performers" }, { href: "#winners", label: "Previous winners" }]} />

      <section id="bracket" className="container-x scroll-mt-40 pt-20">
        <SectionHeading eyebrow="Hover a club to trace its path" title={<>The road to the <em className="gold-text">final</em></>} />
        <div className="glass rounded-3xl p-6 sm:p-8">
          {qf.length ? <Bracket qf={qf} sf={sf} final={finalM ? toBracket(finalM) : null} championId={season.championId} /> : <EmptyState title="Knockout rounds not drawn yet" body="The bracket appears here once the group stage is complete." />}
        </div>
      </section>

      <section id="groups" className="container-x scroll-mt-40 pt-24">
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
      </section>

      <section id="upcoming" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="Midweek nights" title={<>Upcoming <em className="gold-text">matches</em></>} action={{ href: "/fixtures?comp=champions-league", label: "All fixtures" }} />
        {upcoming.length ? (
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((m) => (
              <StaggerItem key={m.id}>
                <MatchCard m={m} showComp={false} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState title="Season complete" body="Every Champions League tie has been played." />
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
