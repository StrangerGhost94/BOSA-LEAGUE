import { notFound } from "next/navigation";
import { CompetitionHero, HonoursList, LeaderBoard, MatchdayNav, SubNav, TeamGoalsChart } from "@/components/competition";
import { FixtureRow, StandingsTable } from "@/components/match";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Icon, SectionHeading } from "@/components/ui";
import { ActionForm, Field, Submit } from "@/components/form";
import { applyTeamAction } from "@/app/actions/public";
import { getCompetition, getHonours, getMatches, getPlayerStats, getRules, getSeasonTable, getSeasonTotals, getTeams } from "@/lib/data";
import { fmtLong } from "@/lib/format";

export const metadata = { title: "BOSA Super League" };

export default async function SuperLeaguePage({ searchParams }: { searchParams: { r?: string } }) {
  const c = await getCompetition("super-league");
  if (!c?.season) notFound();
  const season = c.season;
  const [table, all, stats, honours, teams, totals, rules] = await Promise.all([
    getSeasonTable(season.id),
    getMatches({ seasonId: season.id }),
    getPlayerStats({ seasonId: season.id }),
    getHonours(c.comp.id),
    getTeams(),
    getSeasonTotals(season.id),
    getRules(c.comp.id),
  ]);
  const total = Math.max(1, ...all.map((m) => m.matchday ?? 0));
  const played = Math.max(0, ...all.filter((m) => m.status === "FULL_TIME").map((m) => m.matchday ?? 0));
  const next = all.find((m) => m.status !== "FULL_TIME")?.matchday ?? total;
  const r = Math.min(total, Math.max(1, parseInt(searchParams.r ?? "", 10) || next));
  const roundMatches = all.filter((m) => m.matchday === r);
  const scorers = stats.filter((p) => p.goals > 0).slice(0, 6);
  const potm = [...stats].filter((p) => p.potm > 0).sort((a, b) => b.potm - a.potm).slice(0, 6);
  const compRules = rules.filter((x) => x.competitionId === c.comp.id);

  return (
    <>
      <CompetitionHero
        type="SUPER"
        name="Super League"
        season={`BOSA Super League · ${season.name}`}
        tagline={c.comp.tagline}
        description={c.comp.description}
        stats={[
          { label: "Clubs", value: table.length },
          { label: "Rounds", value: total },
          { label: "Goals", value: totals.goals },
          { label: "Matches played", value: totals.played },
        ]}
      />
      <SubNav items={[{ href: "#overview", label: "Overview" }, { href: "#table", label: "Standings" }, { href: "#fixtures", label: "Fixtures" }, { href: "#stats", label: "Team statistics" }, { href: "#register", label: "Registration" }, { href: "#champions", label: "Champions" }]} />

      <section id="overview" className="container-x scroll-mt-40 pt-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { t: "Students and alumni", d: "Every matchday squad blends current students with the graduates who built these clubs. At least six registered students must be named." },
            { t: "Single round-robin", d: `Eight invited sides, ${total} rounds, one champion. Every match counts and there is no second chance.` },
            { t: "Saturday afternoons", d: "Super League fixtures are staged on Saturdays at the BOSA Floodlit Ground, Kansanga, leaving Sundays to the League." },
          ].map((x, i) => (
            <FadeIn key={x.t} delay={i * 0.08}>
              <div className="panel h-full p-7">
                <div className="font-display text-5xl text-emerald-400/60">0{i + 1}</div>
                <h3 className="mt-4 font-serif text-2xl">{x.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/55">{x.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section id="table" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="Live and automatic" title={<>Super League <em className="gold-text">standings</em></>} />
        <FadeIn>
          <div className="panel p-2 sm:p-4">
            <StandingsTable rows={table} />
          </div>
        </FadeIn>
      </section>

      <section id="fixtures" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow={roundMatches[0] ? fmtLong(roundMatches[0].kickoff) : ""} title={<>Round <em className="gold-text">{r}</em></>} />
        <MatchdayNav base="/super-league" current={r} total={total} played={played} param="r" label="R" />
        <Stagger className="panel mt-6 p-2 sm:p-3">
          {roundMatches.map((m) => (
            <StaggerItem key={m.id}>
              <FixtureRow m={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section id="stats" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="By the numbers" title={<>Team <em className="gold-text">statistics</em></>} />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <TeamGoalsChart rows={table} />
          <div className="grid gap-6">
            <LeaderBoard title="Top scorers" players={scorers} stat="goals" unit="goals" />
            <LeaderBoard title="Player of the match" players={potm} stat="potm" unit="awards" />
          </div>
        </div>
      </section>

      <section id="register" className="container-x scroll-mt-40 pt-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeading eyebrow={season.registrationOpen ? "Registration open" : "Registration closed"} title={<>Enter your <em className="gold-text">side</em></>} />
            <p className="text-ivory/60">{season.registrationNote}</p>
            <ul className="mt-8 space-y-4">
              {compRules.map((x) => (
                <li key={x.id} className="flex gap-4">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-emerald/40 text-emerald-400">
                    <Icon name="check" size={14} />
                  </span>
                  <div>
                    <div className="font-semibold">{x.title}</div>
                    <div className="text-sm text-ivory/55">{x.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <FadeIn>
            <div className="glass rounded-3xl p-6 sm:p-8">
              {season.registrationOpen ? (
                <ActionForm action={applyTeamAction} resetOnSuccess className="grid gap-5 sm:grid-cols-2" toast={false}>
                  <Field label="Team name" className="sm:col-span-2">
                    <input name="teamName" required className="input" placeholder="e.g. Kansanga Alumni XI" />
                  </Field>
                  <Field label="Contact person">
                    <input name="contactName" required className="input" />
                  </Field>
                  <Field label="Phone">
                    <input name="phone" required className="input" placeholder="07XX XXX XXX" />
                  </Field>
                  <Field label="Email">
                    <input name="email" type="email" required className="input" />
                  </Field>
                  <Field label="University or campus">
                    <input name="campus" required className="input" />
                  </Field>
                  <Field label="Squad type">
                    <select name="affiliation" className="input">
                      <option value="STUDENT">Mostly students</option>
                      <option value="ALUMNI">Mostly alumni</option>
                    </select>
                  </Field>
                  <Field label="Squad size">
                    <input name="squadSize" type="number" min={11} max={30} className="input" defaultValue={20} />
                  </Field>
                  <Field label="Message (optional)" className="sm:col-span-2">
                    <textarea name="message" rows={3} className="input" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Submit className="btn-primary w-full py-3" pendingText="Submitting">
                      Submit application
                    </Submit>
                  </div>
                </ActionForm>
              ) : (
                <p className="text-ivory/60">Registration is currently closed. Follow the Newsroom for the next window.</p>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="champions" className="container-x scroll-mt-40 pt-24">
        <SectionHeading eyebrow="Roll of honour" title={<>Previous <em className="gold-text">champions</em></>} />
        <HonoursList honours={honours} teams={teams} />
      </section>
    </>
  );
}
