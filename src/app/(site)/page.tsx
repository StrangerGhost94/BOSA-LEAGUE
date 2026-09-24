import Link from "next/link";
import { StadiumBackdrop } from "@/components/site/stadium";
import { CountUp, FadeIn, HeroParallax, Magnetic, RevealText, Stagger, StaggerItem } from "@/components/motion";
import { Arrow, BosaLogo, Crest, FormPills, Icon, SectionHeading, CompetitionBadge } from "@/components/ui";
import { FixtureRow, MatchCard } from "@/components/match";
import { NewsCard } from "@/components/news";
import { Countdown } from "@/components/countdown";
import { CompetitionSwitcher, type CompPreview } from "@/components/competition-switcher";
import {
  getArticles,
  getCompetition,
  getGroupTables,
  getHonours,
  getMatches,
  getRecentResults,
  getSeasonTable,
  getSeasonTotals,
  getTeams,
  getTopScorers,
  getLiveMatches,
  getCurrentSeasonIds,
} from "@/lib/data";
import { fmtDate, fmtLong, fmtTime } from "@/lib/format";

export default async function HomePage() {
  const [lg, cl, sl, teams] = await Promise.all([getCompetition("bosa-league"), getCompetition("champions-league"), getCompetition("super-league"), getTeams()]);
  const lgSeason = lg!.season!;
  const [table, upcoming, totals, scorers, news, honours, live, seasonIds] = await Promise.all([
    getSeasonTable(lgSeason.id),
    getMatches({ seasonId: lgSeason.id, status: "upcoming", limit: 14 }),
    getSeasonTotals(lgSeason.id),
    getTopScorers(lgSeason.id, 5),
    getArticles({ limit: 7 }),
    getHonours(),
    getLiveMatches(),
    getCurrentSeasonIds(),
  ]);
  const recent = await getRecentResults(6, seasonIds);

  const nextMd = upcoming[0]?.matchday;
  const matchday = upcoming.filter((m) => m.matchday === nextMd);
  const rank = Object.fromEntries(table.map((r) => [r.teamId, r.position]));
  const featured =
    live[0] ??
    [...matchday].sort((a, b) => (rank[a.homeTeamId!] + rank[a.awayTeamId!]) - (rank[b.homeTeamId!] + rank[b.awayTeamId!]))[0];
  const leader = table[0];
  const topScorer = scorers[0];

  // Competition previews
  const previews: CompPreview[] = [];
  previews.push({
    slug: "bosa-league",
    href: "/league",
    name: "BOSA League",
    type: "LEAGUE",
    tagline: lg!.comp.tagline ?? "",
    season: `${lgSeason.name} · ${lgSeason.year}`,
    tableTitle: "Standings",
    rows: table.slice(0, 5).map((r) => ({ pos: r.position, name: r.team.name, crest: r.team.crest, primaryColor: r.team.primaryColor, pts: r.points, played: r.played, gd: r.goalDifference })),
    fixtures: matchday.slice(0, 3).map((m) => ({ id: m.id, home: m.homeTeam, away: m.awayTeam, when: `${fmtDate(m.kickoff, { day: "numeric", month: "short" })} ${fmtTime(m.kickoff)}`, round: m.round })),
    stat: [
      { label: "Goals", value: String(totals.goals) },
      { label: "Played", value: `${totals.played}/${totals.total}` },
      { label: "Per game", value: totals.played ? (totals.goals / totals.played).toFixed(2) : "0" },
    ],
  });
  const [clData, slData] = await Promise.all([
    cl?.season
      ? Promise.all([getGroupTables(cl.season.id), getMatches({ seasonId: cl.season.id, status: "upcoming", limit: 3 }), getSeasonTotals(cl.season.id), getMatches({ seasonId: cl.season.id, stage: "SEMI_FINAL" })])
      : null,
    sl?.season ? Promise.all([getSeasonTable(sl.season.id), getMatches({ seasonId: sl.season.id, status: "upcoming", limit: 3 }), getSeasonTotals(sl.season.id)]) : null,
  ]);
  if (cl?.season && clData) {
    const [groups, clUp, clTot, semis] = clData;
    previews.push({
      slug: "champions-league",
      href: "/champions-league",
      name: "Champions League",
      type: "CHAMPIONS",
      tagline: cl.comp.tagline ?? "",
      season: cl.season.name,
      tableTitle: "Group winners",
      rows: groups.filter((g) => g.rows.length).map((g, i) => ({ pos: i + 1, name: `${g.rows[0].team.name}`, crest: g.rows[0].team.crest, primaryColor: g.rows[0].team.primaryColor, pts: g.rows[0].points, played: g.rows[0].played, gd: g.rows[0].goalDifference })),
      fixtures: clUp.map((m) => ({ id: m.id, home: m.homeTeam, away: m.awayTeam, when: `${fmtDate(m.kickoff, { day: "numeric", month: "short" })} ${fmtTime(m.kickoff)}`, round: m.round })),
      stat: [
        { label: "Goals", value: String(clTot.goals) },
        { label: "Groups", value: String(groups.length) },
        { label: "Stage", value: !groups.length ? "Draw soon" : semis.length ? (semis.some((s) => s.status !== "FULL_TIME") ? "Semis" : "Final") : "Groups" },
      ],
    });
  }
  if (sl?.season && slData) {
    const [slTable, slUp, slTot] = slData;
    previews.push({
      slug: "super-league",
      href: "/super-league",
      name: "Super League",
      type: "SUPER",
      tagline: sl.comp.tagline ?? "",
      season: sl.season.name,
      tableTitle: "Standings",
      rows: slTable.slice(0, 5).map((r) => ({ pos: r.position, name: r.team.name, crest: r.team.crest, primaryColor: r.team.primaryColor, pts: r.points, played: r.played, gd: r.goalDifference })),
      fixtures: slUp.map((m) => ({ id: m.id, home: m.homeTeam, away: m.awayTeam, when: `${fmtDate(m.kickoff, { day: "numeric", month: "short" })} ${fmtTime(m.kickoff)}`, round: m.round })),
      stat: [
        { label: "Goals", value: String(slTot.goals) },
        { label: "Clubs", value: String(slTable.length) },
        { label: "Played", value: String(slTot.played) },
      ],
    });
  }

  const featuredNews = news.find((n) => n.featured) ?? news[0];
  const sideNews = news.filter((n) => n.id !== featuredNews?.id).slice(0, 4);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-32 lg:pb-24">
        <HeroParallax className="absolute inset-0">
          <StadiumBackdrop />
        </HeroParallax>
        <div className="container-x relative z-10 grid items-end gap-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <FadeIn className="mb-7 flex flex-wrap items-center gap-3">
              <span className="chip border-gold/30 text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {lgSeason.name} · {lgSeason.year}
              </span>
              {nextMd && <span className="chip text-ivory/70">Matchday {nextMd} · {fmtDate(matchday[0].kickoff, { weekday: "long", day: "numeric", month: "long" })}</span>}
            </FadeIn>
            <h1 className="headline text-[15vw] leading-[0.88] sm:text-[88px] lg:text-[112px] xl:text-[128px]">
              <RevealText text="The Sunday" className="block" />
              <span className="block">
                <RevealText text="Institution." className="gold-text italic" delay={0.25} />
              </span>
            </h1>
            <FadeIn delay={0.6}>
              <p className="mt-8 max-w-xl text-base leading-relaxed text-ivory/65 sm:text-lg">
                Fourteen clubs of students and alumni. Three competitions. One pitch behind Shell Kabalagala where reputations are made every weekend.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Magnetic>
                  <Link href="/fixtures" className="btn-primary px-7 py-3.5">
                    Matchday fixtures <Arrow />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link href="/membership" className="btn-ghost px-7 py-3.5">
                    Become a member
                  </Link>
                </Magnetic>
              </div>
            </FadeIn>
          </div>

          {featured && (
            <FadeIn delay={0.5} className="w-full">
              <div className="glass relative overflow-hidden rounded-3xl p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,.9)] sm:p-7">
                <div
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{ background: `radial-gradient(70% 60% at 0% 0%, ${featured.homeTeam?.primaryColor}40, transparent 70%), radial-gradient(70% 60% at 100% 100%, ${featured.awayTeam?.primaryColor}40, transparent 70%)` }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="eyebrow">{live[0] ? "Live now" : "Featured match"}</span>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-ivory/50">{featured.round}</span>
                </div>
                <div className="relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="text-center">
                    <Crest team={featured.homeTeam} size={84} className="mx-auto" />
                    <div className="mt-3 font-serif text-xl">{featured.homeTeam?.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ivory/40">{rank[featured.homeTeamId!] ? `${ordinal(rank[featured.homeTeamId!])} in table` : ""}</div>
                  </div>
                  <div className="text-center">
                    {featured.status === "SCHEDULED" ? (
                      <div className="font-display text-4xl text-gold">{fmtTime(featured.kickoff)}</div>
                    ) : (
                      <div className="font-display text-5xl">
                        {featured.homeScore}-{featured.awayScore}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ivory/40">{fmtDate(featured.kickoff)}</div>
                  </div>
                  <div className="text-center">
                    <Crest team={featured.awayTeam} size={84} className="mx-auto" />
                    <div className="mt-3 font-serif text-xl">{featured.awayTeam?.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ivory/40">{rank[featured.awayTeamId!] ? `${ordinal(rank[featured.awayTeamId!])} in table` : ""}</div>
                  </div>
                </div>
                {featured.status === "SCHEDULED" && (
                  <div className="relative mt-7 flex justify-center">
                    <Countdown to={featured.kickoff.toISOString()} />
                  </div>
                )}
                <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs text-ivory/55">
                  <span className="flex items-center gap-1.5">
                    <Icon name="pin" size={14} /> {featured.venue?.name}, {featured.venue?.area}
                  </span>
                  <Link href={`/matches/${featured.id}`} className="flex items-center gap-1 font-semibold text-gold hover:underline">
                    Preview <Arrow />
                  </Link>
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      {/* crest marquee */}
      <section className="relative border-y border-white/[0.06] bg-night-800/60 py-6">
        <div className="mask-fade-x overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 hover:[animation-play-state:paused]">
            {[...teams, ...teams].map((t, i) => (
              <Link key={i} href={`/teams/${t.slug}`} className="group flex items-center gap-3 opacity-70 transition hover:opacity-100">
                <Crest team={t} size={40} />
                <span className="font-display text-sm uppercase tracking-[0.18em] text-ivory/70 group-hover:text-ivory">{t.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- MATCHDAY TIMELINE ---------------- */}
      {matchday.length > 0 && (
        <section className="container-x pt-24">
          <SectionHeading eyebrow={`Upcoming · ${fmtLong(matchday[0].kickoff)}`} title={<>Matchday {nextMd} <em className="gold-text">fixtures</em></>} action={{ href: "/fixtures", label: "All fixtures" }} />
          <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
            <FadeIn>
              <div className="relative overflow-hidden rounded-3xl border border-crimson/30 bg-gradient-to-br from-crimson-600 via-crimson-800 to-night-800 p-7">
                <div className="absolute -right-12 -top-12 opacity-20">
                  <BosaLogo size={220} />
                </div>
                <div className="relative">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ivory/70">Matchday</div>
                  <div className="font-display text-[120px] leading-none">{nextMd}</div>
                  <div className="mt-2 font-serif text-2xl">{fmtDate(matchday[0].kickoff, { weekday: "long", day: "numeric", month: "long" })}</div>
                  <div className="mt-6 space-y-2 text-sm text-ivory/80">
                    <div className="flex items-center gap-2"><Icon name="clock" size={15} /> {fmtTime(matchday[0].kickoff)} to {fmtTime(matchday[matchday.length - 1].kickoff)}</div>
                    <div className="flex items-center gap-2"><Icon name="pin" size={15} /> {matchday[0].venue?.name}, {matchday[0].venue?.area}</div>
                    <div className="pl-6 text-xs text-ivory/60">{matchday[0].venue?.address}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
            <Stagger className="relative">
              <div className="absolute bottom-6 left-[5px] top-6 w-px bg-gradient-to-b from-gold/50 via-gold/15 to-transparent" />
              {matchday.map((m) => (
                <StaggerItem key={m.id} className="relative pl-6">
                  <span className="absolute left-[1.5px] top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_12px_rgba(214,182,118,.8)]" />
                  <FixtureRow m={m} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* ---------------- STATS BAND ---------------- */}
      <section className="container-x pt-28">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-night-800/60 px-6 py-12 sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(214,182,118,.12),transparent)]" />
          <div className="relative grid grid-cols-2 gap-y-10 md:grid-cols-5">
            {[
              { v: totals.goals, l: "Goals this season" },
              { v: totals.played, l: "Matches played" },
              { v: teams.length, l: "Registered clubs" },
              { v: (upcoming[0]?.matchday ?? 1) - 1, l: "Matchdays played" },
              { v: scorers[0]?.goals ?? 0, l: "Top scorer goals" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <CountUp value={s.v} className="gold-text font-display text-5xl font-semibold sm:text-6xl" />
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ivory/45">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- COMPETITIONS ---------------- */}
      <section className="container-x pt-28">
        <SectionHeading eyebrow="Three competitions" title={<>Choose your <em className="gold-text">stage</em></>} />
        <CompetitionSwitcher items={previews} />
      </section>

      {/* ---------------- LEADER + TOP SCORER (ivory) ---------------- */}
      <section className="relative mt-28 bg-ivory py-24 text-night-800">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="container-x">
          <SectionHeading light eyebrow="The summit" title={<>Leading the <em className="text-crimson">race</em></>} action={{ href: "/league", label: "Full standings" }} />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {leader && (
              <FadeIn>
                <Link
                  href={`/teams/${leader.team.slug}`}
                  className="group relative block overflow-hidden rounded-3xl p-8 text-ivory sm:p-10"
                  style={{ background: `linear-gradient(135deg, ${leader.team.primaryColor} 0%, #0A0F1E 80%)` }}
                >
                  <div className="absolute -right-16 -top-16 opacity-25 transition-transform duration-1000 group-hover:rotate-6 group-hover:scale-110">
                    <Crest team={leader.team} size={340} ring={false} />
                  </div>
                  <div className="relative">
                    <div className="eyebrow text-gold-300">League leader</div>
                    <div className="mt-6 flex items-center gap-5">
                      <Crest team={leader.team} size={96} />
                      <div>
                        <div className="headline text-5xl sm:text-6xl">{leader.team.name}</div>
                        <div className="mt-2 text-sm text-ivory/60">{leader.team.campus}</div>
                      </div>
                    </div>
                    <div className="mt-10 grid grid-cols-4 gap-4 border-t border-white/15 pt-6">
                      {[
                        ["Points", leader.points],
                        ["Won", leader.won],
                        ["Goals", leader.goalsFor],
                        ["GD", leader.goalDifference],
                      ].map(([l, v]) => (
                        <div key={l as string}>
                          <div className="font-display text-4xl">
                            <CountUp value={v as number} />
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-ivory/50">{l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center gap-3 text-xs text-ivory/60">
                      Form <FormPills form={leader.form} />
                    </div>
                  </div>
                </Link>
              </FadeIn>
            )}
            <div className="grid gap-6">
              {topScorer && (
                <FadeIn delay={0.1}>
                  <Link href={`/players/${topScorer.id}`} className="ivory-card group relative block overflow-hidden border border-night-800/10 bg-white p-8">
                    <div className="eyebrow text-gold-700">Golden boot</div>
                    <div className="mt-5 flex items-center gap-5">
                      <div className="relative grid h-20 w-20 place-items-center rounded-full font-display text-3xl text-white" style={{ background: topScorer.primaryColor }}>
                        {topScorer.number || "–"}
                        <img src={topScorer.crest} alt="" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-white bg-white" />
                      </div>
                      <div>
                        <div className="font-serif text-3xl leading-tight group-hover:text-crimson">
                          {topScorer.firstName} {topScorer.lastName}
                        </div>
                        <div className="text-sm text-night-600/70">{topScorer.teamName}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-display text-6xl text-crimson">
                          <CountUp value={topScorer.goals} />
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-night-600/60">Goals</div>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              )}
              <FadeIn delay={0.2}>
                <div className="ivory-card border border-night-800/10 bg-white p-6">
                  <div className="eyebrow mb-4 text-gold-700">Scoring chart</div>
                  <ul className="space-y-3">
                    {scorers.slice(0, 5).map((p, i) => (
                      <li key={p.id}>
                        <Link href={`/players/${p.id}`} className="group flex items-center gap-3">
                          <span className="w-4 font-display text-night-600/50">{i + 1}</span>
                          <img src={p.crest} alt="" className="h-7 w-7 rounded-full" />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold group-hover:text-crimson">
                              {p.firstName} {p.lastName}
                            </span>
                            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-night-800/10">
                              <span className="bar-grow block h-full rounded-full bg-gradient-to-r from-crimson to-gold" style={{ width: `${(p.goals / scorers[0].goals) * 100}%`, animationDelay: `${i * 120}ms` }} />
                            </span>
                          </span>
                          <span className="font-display text-xl">{p.goals}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- RECENT RESULTS ---------------- */}
      <section className="container-x pt-28">
        <SectionHeading eyebrow="Final whistle" title={<>Recent <em className="gold-text">results</em></>} action={{ href: "/fixtures?status=completed", label: "All results" }} />
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recent.map((m) => (
            <StaggerItem key={m.id}>
              <MatchCard m={m} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---------------- NEWS ---------------- */}
      <section className="container-x pt-28">
        <SectionHeading eyebrow="BOSA Newsroom" title={<>Stories from the <em className="gold-text">touchline</em></>} action={{ href: "/news", label: "Newsroom" }} />
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {featuredNews && (
            <FadeIn>
              <NewsCard a={featuredNews} variant="feature" />
            </FadeIn>
          )}
          <FadeIn delay={0.1}>
            <div className="panel px-5">
              {sideNews.map((a) => (
                <NewsCard key={a.id} a={a} variant="compact" />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---------------- HONOURS ---------------- */}
      {honours.length > 0 && <section className="container-x pt-28">
        <SectionHeading eyebrow="Roll of honour" title={<>Previous <em className="gold-text">champions</em></>} />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {honours.slice(0, 8).map((h) => {
            const t = teams.find((x) => x.name === h.champion);
            return (
              <StaggerItem key={h.id}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-night-800/60 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-gold/30">
                  <div className="flex items-center justify-between">
                    <CompetitionBadge type={h.competition.type} size={36} />
                    <span className="font-display text-3xl text-ivory/15 transition group-hover:text-gold/40">{h.year}</span>
                  </div>
                  <div className="mt-6 text-[10px] uppercase tracking-[0.2em] text-ivory/45">
                    {h.competition.name} · {h.seasonName}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {t && <Crest team={t} size={34} />}
                    <span className="font-serif text-2xl">{h.champion}</span>
                  </div>
                  {h.runnerUp && <div className="mt-3 text-xs text-ivory/45">Runner-up: {h.runnerUp}</div>}
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>}

      {/* ---------------- MEMBERSHIP CTA ---------------- */}
      <section className="container-x pt-28">
        <FadeIn>
          <div className="relative overflow-hidden rounded-[2rem] border border-gold/25 px-6 py-16 text-center sm:px-16">
            <StadiumBackdrop intensity={0.7} />
            <div className="relative">
              <BosaLogo size={72} className="mx-auto" />
              <h2 className="headline mx-auto mt-8 max-w-3xl text-4xl sm:text-6xl">
                One payment. <em className="gold-text">The whole season.</em>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-ivory/60">
                Full match centre, line-ups, player profiles and members-only stories. Pay once with Mobile Money or card through Pesapal.
              </p>
              <Magnetic className="mt-10">
                <Link href="/membership" className="btn-gold px-8 py-3.5">
                  Become a member <Arrow />
                </Link>
              </Magnetic>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
