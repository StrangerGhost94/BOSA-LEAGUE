import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { CompetitionHero, HonoursList } from "@/components/competition";
import { MatchCard } from "@/components/match";
import { FadeIn } from "@/components/motion";
import { EmptyState, SectionHeading } from "@/components/ui";
import { getCompetition, getHonours, getMatches, getTeams } from "@/lib/data";

export const metadata = { title: "BOSA Super League" };

export default async function SuperLeaguePage() {
  const c = await getCompetition("super-league");
  if (!c) notFound();
  const [allSeasons, honours, teams] = await Promise.all([
    db.query.seasons.findMany({ where: eq(seasons.competitionId, c.comp.id), with: { champion: true }, orderBy: desc(seasons.year) }),
    getHonours(c.comp.id),
    getTeams(),
  ]);
  const matches = (await Promise.all(allSeasons.map((s) => getMatches({ seasonId: s.id })))).flat().sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());
  const current = matches[0];
  const past = matches.slice(1);
  // Winners from recorded matches, plus any honours the League office has added by hand
  const recorded = allSeasons
    .filter((s) => s.champion && !honours.some((h) => h.seasonName === s.name))
    .map((s) => ({ id: s.id, seasonName: s.name, year: s.year, champion: s.champion!.name, runnerUp: null, topScorer: null, note: null }));
  const roll = [...recorded, ...honours].sort((a, b) => b.year - a.year);

  return (
    <>
      <CompetitionHero
        type="SUPER"
        name="Super League"
        season={`BOSA Super League${c.season ? ` · ${c.season.name}` : ""}`}
        tagline="The match that opens every season."
        description="One match, one trophy. Each season opens with last season's BOSA League champion against last season's BOSA Champions League winner."
        stats={[
          { label: "Matches per season", value: 1 },
          { label: "Editions recorded", value: matches.filter((m) => m.status === "FULL_TIME").length + honours.length },
          { label: "Clubs in the league", value: teams.length },
          { label: "Seasons", value: allSeasons.length },
        ]}
      />

      <section className="container-x pt-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { t: "League champion", d: "The club that won the BOSA League last season earns one of the two places." },
            { t: "Champions League winner", d: "The club that won the BOSA Champions League last season takes the other place." },
            { t: "The season opener", d: "The two meet in a single match that opens the new season, and the winner lifts the Super League trophy." },
          ].map((x, i) => (
            <FadeIn key={x.t} delay={i * 0.06}>
              <div className="panel h-full p-7">
                <div className="font-display text-5xl text-emerald-400/60">0{i + 1}</div>
                <h3 className="mt-4 font-serif text-2xl">{x.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/55">{x.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="container-x pt-20">
        <SectionHeading eyebrow={current?.status === "FULL_TIME" ? "Latest edition" : "Next edition"} title={<>The <em className="gold-text">match</em></>} />
        {current ? (
          <FadeIn className="mx-auto max-w-2xl">
            <MatchCard m={current} showComp={false} />
          </FadeIn>
        ) : (
          <EmptyState
            title="The next Super League match will appear here"
            body="Once the League office confirms the BOSA League champion and the Champions League winner, the season opener is scheduled here."
            action={<Link href="/league" className="btn-ghost">See the BOSA League race</Link>}
          />
        )}
        {past.length > 0 && (
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {past.map((m) => (
              <MatchCard key={m.id} m={m} showComp={false} />
            ))}
          </div>
        )}
      </section>

      <section className="container-x pt-24">
        <SectionHeading eyebrow="Roll of honour" title={<>Super League <em className="gold-text">winners</em></>} />
        <HonoursList honours={roll} teams={teams} />
      </section>
    </>
  );
}
