import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams, seasonTeams } from "@/db/schema";
import { getCurrentSeason, getMatches, getPlayerStats, getSeasonTable, getArticles, getGroupTables, visibleTo } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { CountUp, FadeIn, HeroParallax, Stagger, StaggerItem } from "@/components/motion";
import { Crest, FormPills, SectionHeading, StatTile, Pill } from "@/components/ui";
import { FixtureRow, MatchCard } from "@/components/match";
import { NewsCard } from "@/components/news";
import { POSITION_LABEL } from "@/lib/format";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const t = await db.query.teams.findFirst({ where: eq(teams.slug, params.slug) });
  return { title: t?.name ?? "Team" };
}

export default async function TeamPage({ params }: { params: { slug: string } }) {
  const t = await db.query.teams.findFirst({ where: eq(teams.slug, params.slug) });
  if (!t) notFound();
  const lg = await getCurrentSeason("bosa-league");
  const [table, matches, squad, news, entries] = await Promise.all([
    lg ? getSeasonTable(lg.id) : Promise.resolve([]),
    getMatches({ teamId: t.id }),
    getPlayerStats({ teamId: t.id }),
    getArticles({ teamId: t.id, limit: 3 }),
    db.query.seasonTeams.findMany({ where: eq(seasonTeams.teamId, t.id), with: { season: { with: { competition: true } } } }),
  ]);
  const row = table.find((r) => r.teamId === t.id);
  const results = matches.filter((m) => m.status === "FULL_TIME" && m.homeScore != null).reverse();
  const member = hasMembership(await getCurrentUser());
  const upcoming = visibleTo(matches.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED"), member).slice(0, 4);
  const all = results.reduce(
    (acc, m) => {
      const home = m.homeTeamId === t.id;
      const gf = (home ? m.homeScore : m.awayScore) ?? 0;
      const ga = (home ? m.awayScore : m.homeScore) ?? 0;
      acc.gf += gf;
      acc.ga += ga;
      if (ga === 0) acc.cs++;
      if (gf > ga) acc.w++;
      return acc;
    },
    { gf: 0, ga: 0, cs: 0, w: 0 },
  );
  const current = entries.filter((e) => e.season.isCurrent);
  const groups = await Promise.all(current.filter((e) => e.season.competition.type === "CHAMPIONS").map((e) => getGroupTables(e.seasonId)));
  const myGroup = groups.flat().find((g) => g.rows.some((r) => r.teamId === t.id));
  const positions = ["GK", "DEF", "MID", "FWD"] as const;
  const light = t.primaryColor.toLowerCase() === "#0d0d0d" ? "#F2F2F2" : t.primaryColor;

  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-36">
        <HeroParallax className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: `radial-gradient(90% 90% at 80% 20%, ${t.primaryColor} 0%, #0A0F1E 60%, #060913 100%)` }} />
          <div className="absolute -right-24 top-10 opacity-[0.12] sm:-right-10">
            <img src={t.crest} alt="" className="h-[520px] w-[520px] rounded-full object-cover" />
          </div>
          <div className="pitch-lines absolute inset-0 opacity-40" />
        </HeroParallax>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night-900 to-transparent" />
        <div className="container-x relative">
          <FadeIn className="flex flex-col gap-8 sm:flex-row sm:items-end">
            <Crest team={t} size={160} className="max-sm:!h-28 max-sm:!w-28" />
            <div>
              <div className="eyebrow">{t.intakeYear ? `${t.intakeYear} intake` : t.campus}</div>
              <h1 className="headline mt-3 text-6xl sm:text-8xl">{t.name}</h1>
              {t.motto && <p className="mt-3 font-serif text-xl italic text-ivory/70">&ldquo;{t.motto}&rdquo;</p>}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {current.map((e) => (
                  <Pill key={e.seasonId} tone="gold">
                    {e.season.competition.name}
                  </Pill>
                ))}
                <span className="flex h-2 w-20 overflow-hidden rounded-full">
                  <span className="flex-[3]" style={{ background: t.primaryColor }} />
                  <span className="flex-[2]" style={{ background: t.secondaryColor }} />
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="container-x">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatTile label="League position">{row ? <CountUp value={row.position} /> : "-"}</StatTile>
          <StatTile label="Points">{row ? <CountUp value={row.points} /> : "-"}</StatTile>
          <StatTile label="Goals scored" hint="BOSA League" accent="crimson"><CountUp value={row?.goalsFor ?? all.gf} /></StatTile>
          <StatTile label="Goals conceded" hint="BOSA League"><CountUp value={row?.goalsAgainst ?? all.ga} /></StatTile>
          <StatTile label="Record" hint="Won · drawn · lost" accent="emerald">{row ? `${row.won}-${row.drawn}-${row.lost}` : "-"}</StatTile>
        </div>
      </section>

      <section className="container-x pt-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          <FadeIn>
            <div className="panel h-full p-7">
              <div className="eyebrow mb-5">Club profile</div>
              <dl className="grid grid-cols-2 gap-6 text-sm">
                {[
                  ["Intake", t.intakeYear ? `Joined Bilal Institute in ${t.intakeYear}` : "-"],
                  ["Head coach", t.coachName ?? "To be confirmed"],
                  ["Captain", t.captainName ?? "To be confirmed"],
                  ["Home ground", t.homeVenue ?? "Henry's Pitch"],
                  ["Squad size", squad.length],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">{k}</dt>
                    <dd className="mt-1 text-ivory/90">{v}</dd>
                  </div>
                ))}
              </dl>
              {t.bio && <p className="mt-8 border-t border-white/[0.06] pt-6 text-sm leading-relaxed text-ivory/60">{t.bio}</p>}
              {row && (
                <div className="mt-6 flex items-center gap-3 text-xs text-ivory/50">
                  League form <FormPills form={row.form} />
                </div>
              )}
              {myGroup && (
                <div className="mt-4 text-xs text-ivory/50">
                  Champions League: {myGroup.name}, {myGroup.rows.findIndex((r) => r.teamId === t.id) + 1} of {myGroup.rows.length}
                </div>
              )}
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="panel h-full p-4">
              <div className="eyebrow mb-2 px-3 pt-3">Next fixtures</div>
              {upcoming.map((m) => (
                <FixtureRow key={m.id} m={m} />
              ))}
              {upcoming.length === 0 && <p className="px-3 py-6 text-sm text-ivory/45">No fixtures scheduled.</p>}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="container-x pt-14 sm:pt-20">
        <SectionHeading eyebrow={`${squad.length} registered players`} title={<>The <em className="gold-text">squad</em></>} />
        <div className="space-y-10">
          {positions.map((p) => {
            const list = squad.filter((s) => s.position === p).sort((a, b) => a.number - b.number);
            if (!list.length) return null;
            return (
              <div key={p}>
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/45">{POSITION_LABEL[p]}s</div>
                <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {list.map((pl) => (
                    <StaggerItem key={pl.id}>
                      <Link href={`/players/${pl.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-night-800/60 p-4 transition hover:-translate-y-0.5 hover:border-gold/30">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-xl" style={{ background: `${light}22`, color: light }}>
                          {pl.number || "–"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold group-hover:text-gold">
                            {pl.firstName} {pl.lastName}
                          </span>
                          <span className="text-xs text-ivory/45">
                            {pl.goals} G · {pl.assists} A · {pl.apps} apps
                          </span>
                        </span>
                        {pl.status !== "ACTIVE" && <Pill tone={pl.status === "SUSPENDED" ? "crimson" : "gold"}>{pl.status === "SUSPENDED" ? "Susp." : "Injured"}</Pill>}
                      </Link>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            );
          })}
        </div>
      </section>

      {results.length > 0 && (
        <section className="container-x pt-14 sm:pt-20">
          <SectionHeading eyebrow="All competitions" title={<>Recent <em className="gold-text">results</em></>} />
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, 6).map((m) => (
              <StaggerItem key={m.id}>
                <MatchCard m={m} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {news.length > 0 && (
        <section className="container-x pt-14 sm:pt-20">
          <SectionHeading eyebrow="Newsroom" title={<>{t.name} <em className="gold-text">stories</em></>} />
          <div className="grid gap-5 md:grid-cols-3">
            {news.map((a) => (
              <NewsCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
