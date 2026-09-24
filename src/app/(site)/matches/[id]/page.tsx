import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { getMatch, getSeasonTable, getGroupTables, getMatches } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { AnimatedScore, FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Crest, Icon, SectionHeading, StatusBadge } from "@/components/ui";
import { StandingsTable, FixtureRow } from "@/components/match";
import { MembersLock } from "@/components/members-lock";
import { AutoRefresh } from "@/components/auto-refresh";
import { VoteForm } from "@/components/vote-form";
import { VoteResults } from "@/components/vote-results";
import { voteMatchAction } from "@/app/actions/members";
import { isPublicNow, matchVoteOpen } from "@/lib/members";
import { myVote, tally } from "@/lib/votes";
import { db } from "@/db";
import { players } from "@/db/schema";
import { and, eq, notInArray } from "drizzle-orm";
import { fmtLong, fmtTime, liveMinute, STAGE_LABEL } from "@/lib/format";
import { StadiumBackdrop } from "@/components/site/stadium";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const m = await getMatch(params.id);
  return { title: m ? `${m.homeTeam?.name ?? "TBD"} vs ${m.awayTeam?.name ?? "TBD"}` : "Match" };
}

const EV_LABEL: Record<string, string> = {
  GOAL: "Goal",
  PENALTY_GOAL: "Penalty goal",
  OWN_GOAL: "Own goal",
  PENALTY_MISS: "Penalty missed",
  YELLOW: "Yellow card",
  SECOND_YELLOW: "Second yellow",
  RED: "Red card",
  SUB: "Substitution",
};

export default async function MatchPage({ params }: { params: { id: string } }) {
  const m = await getMatch(params.id);
  if (!m) notFound();
  const user = await getCurrentUser();
  const member = hasMembership(user);
  if (!member && !isPublicNow(m)) {
    return (
      <section className="container-x pt-40">
        <MembersLock
          title="Members see this fixture first"
          body={`This fixture is in early access for BOSA League members. It opens to everyone on ${fmtLong(m.publicFrom!)} at ${fmtTime(m.publicFrom!)}.`}
          signedIn={!!user}
        />
      </section>
    );
  }
  const voteOpen = matchVoteOpen(m);
  const [voteRows, mine, voteTeams] = member
    ? await Promise.all([
        tally({ matchId: m.id }),
        user ? myVote(user.id, { matchId: m.id }) : Promise.resolve(null),
        Promise.all(
          [m.homeTeam, m.awayTeam]
            .filter((t): t is NonNullable<typeof t> => !!t)
            .map(async (t) => {
              const inLineup = m.lineups.filter((l) => l.teamId === t.id).map((l) => l.player);
              const squad = inLineup.length
                ? inLineup
                : await db.query.players.findMany({ where: and(eq(players.teamId, t.id), notInArray(players.status, ["PENDING", "REJECTED"])) });
              return { id: t.id, name: t.name, players: squad.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim() })) };
            }),
        ),
      ])
    : [[], null, []];
  const live = m.status === "LIVE" || m.status === "HALF_TIME";
  const played = live || m.status === "FULL_TIME";
  const hasScore = m.homeScore != null && m.awayScore != null;
  const h = m.homeTeam;
  const a = m.awayTeam;

  const table =
    m.stage === "LEAGUE" ? await getSeasonTable(m.seasonId) : m.groupId ? (await getGroupTables(m.seasonId)).find((g) => g.id === m.groupId)?.rows ?? [] : [];
  const tableRows = table.filter((r) => r.teamId === m.homeTeamId || r.teamId === m.awayTeamId || true);
  const h2h =
    h && a
      ? (await getMatches({ teamId: h.id, status: "completed", order: "desc", limit: 50 })).filter((x) => (x.homeTeamId === a.id || x.awayTeamId === a.id) && x.id !== m.id).slice(0, 5)
      : [];

  const goals = m.events.filter((e) => ["GOAL", "PENALTY_GOAL", "OWN_GOAL"].includes(e.type));
  const name = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.firstName.charAt(0)}. ${p.lastName}` : "Unknown");
  const lineup = (teamId?: string) => m.lineups.filter((l) => l.teamId === teamId).sort((x, y) => Number(y.starter) - Number(x.starter) || x.player.number - y.player.number);
  const count = (teamId: string | null | undefined, types: string[]) => m.events.filter((e) => e.teamId === teamId && types.includes(e.type)).length;

  return (
    <>
      <AutoRefresh enabled={live && member} seconds={10} />
      <section className="relative overflow-hidden pb-14 pt-32">
        <StadiumBackdrop intensity={0.8} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(50% 70% at 10% 50%, ${h?.primaryColor ?? "#CC2654"}45, transparent 70%), radial-gradient(50% 70% at 90% 50%, ${a?.primaryColor ?? "#D6B676"}45, transparent 70%)` }}
        />
        <div className="container-x relative">
          <FadeIn className="flex flex-wrap items-center justify-center gap-3 text-center">
            <Link href={m.season.competition.slug === "bosa-league" ? "/league" : `/${m.season.competition.slug}`} className="chip border-gold/30 text-gold hover:bg-gold/10">
              {m.season.competition.name}
            </Link>
            <span className="chip text-ivory/70">
              {m.round}
              {m.group ? ` · ${m.group.name}` : ""}
            </span>
            <StatusBadge status={m.status} minute={liveMinute(m)} />
          </FadeIn>

          <div className="mt-12 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-10">
            <FadeIn className="text-center" delay={0.1}>
              {h ? (
                <Link href={`/teams/${h.slug}`} className="group inline-block">
                  <Crest team={h} size={120} className="mx-auto transition-transform duration-700 group-hover:scale-105 max-sm:!h-20 max-sm:!w-20" />
                  <div className="mt-5 font-serif text-2xl sm:text-4xl">{h.name}</div>
                </Link>
              ) : (
                <div className="font-serif text-2xl text-ivory/50">To be decided</div>
              )}
              <div className="mt-3 space-y-1 text-xs text-ivory/55">
                {goals
                  .filter((g) => g.teamId === h?.id)
                  .map((g) => (
                    <div key={g.id}>
                      {name(g.player)} {g.minute}&apos;{g.type === "PENALTY_GOAL" ? " (pen)" : g.type === "OWN_GOAL" ? " (og)" : ""}
                    </div>
                  ))}
              </div>
            </FadeIn>
            <FadeIn delay={0.2} className="text-center">
              {played && !hasScore ? (
                <div>
                  <div className="font-display text-5xl text-ivory/60 sm:text-7xl">FT</div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ivory/50">Score included in the official table</div>
                </div>
              ) : played ? (
                <div className="flex items-center gap-3 font-display text-6xl font-semibold tabular-nums sm:text-8xl lg:text-9xl">
                  <AnimatedScore value={m.homeScore} />
                  <span className="text-ivory/25">:</span>
                  <AnimatedScore value={m.awayScore} />
                </div>
              ) : (
                <div>
                  <div className="font-display text-5xl text-gold sm:text-7xl">{fmtTime(m.kickoff)}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ivory/50">Kick-off</div>
                </div>
              )}
              {m.homePens != null && m.awayPens != null && <div className="mt-2 text-sm text-gold">Penalties {m.homePens} - {m.awayPens}</div>}
              {live && m.minute != null && <div className="mt-2 font-display text-lg text-crimson-400">{m.status === "HALF_TIME" ? "HT" : `${liveMinute(m)}'`}</div>}
            </FadeIn>
            <FadeIn className="text-center" delay={0.1}>
              {a ? (
                <Link href={`/teams/${a.slug}`} className="group inline-block">
                  <Crest team={a} size={120} className="mx-auto transition-transform duration-700 group-hover:scale-105 max-sm:!h-20 max-sm:!w-20" />
                  <div className="mt-5 font-serif text-2xl sm:text-4xl">{a.name}</div>
                </Link>
              ) : (
                <div className="font-serif text-2xl text-ivory/50">To be decided</div>
              )}
              <div className="mt-3 space-y-1 text-xs text-ivory/55">
                {goals
                  .filter((g) => g.teamId === a?.id)
                  .map((g) => (
                    <div key={g.id}>
                      {name(g.player)} {g.minute}&apos;{g.type === "PENALTY_GOAL" ? " (pen)" : g.type === "OWN_GOAL" ? " (og)" : ""}
                    </div>
                  ))}
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.35}>
            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-4">
              {[
                { i: "calendar" as const, l: "Date", v: fmtLong(m.kickoff) },
                { i: "clock" as const, l: "Kick-off", v: fmtTime(m.kickoff) },
                { i: "pin" as const, l: "Venue", v: m.venue ? `${m.venue.name}, ${m.venue.area}` : "To be confirmed" },
                { i: "whistle" as const, l: "Referee", v: m.referee?.name ?? "To be appointed" },
              ].map((x) => (
                <div key={x.l} className="bg-night-900/80 p-4 backdrop-blur">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ivory/45">
                    <Icon name={x.i} size={12} /> {x.l}
                  </div>
                  <div className="mt-1.5 text-sm">{x.v}</div>
                </div>
              ))}
            </div>
            {m.statusNote && <p className="mt-4 text-center text-sm text-gold">{m.statusNote}</p>}
          </FadeIn>
        </div>
      </section>

      <section className="container-x pt-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-8">
            {played &&
              (member ? (
                <>
                  <FadeIn>
                    <div className="panel p-6">
                      <div className="eyebrow mb-6">Match timeline</div>
                      {m.events.length === 0 && <p className="text-sm text-ivory/45">No events recorded yet.</p>}
                      <Stagger as="ol" className="relative space-y-1">
                        <span className="absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-gold/40 via-white/10 to-transparent" />
                        {m.events.map((e) => {
                          const home = e.teamId === h?.id;
                          return (
                            <StaggerItem as="li" key={e.id} className={clsx("relative grid grid-cols-[1fr_56px_1fr] items-center gap-2")}>
                              <div className={clsx("text-right", !home && "invisible")}>{home && <EventText e={e} name={name} />}</div>
                              <div className="relative z-10 mx-auto grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-night-800 font-display text-sm text-gold">{e.minute}&apos;</div>
                              <div className={clsx(home && "invisible")}>{!home && <EventText e={e} name={name} />}</div>
                            </StaggerItem>
                          );
                        })}
                      </Stagger>
                    </div>
                  </FadeIn>
                  {(m.lineups.length > 0) && (
                    <FadeIn>
                      <div className="panel p-6">
                        <div className="eyebrow mb-6">Line-ups</div>
                        <div className="grid gap-8 sm:grid-cols-2">
                          {[h, a].map((t) => (
                            <div key={t?.id ?? "x"}>
                              <div className="mb-4 flex items-center gap-3">
                                <Crest team={t} size={28} />
                                <span className="font-semibold">{t?.name}</span>
                              </div>
                              <ul className="space-y-1.5">
                                {lineup(t?.id).map((l) => (
                                  <li key={l.playerId}>
                                    <Link href={`/players/${l.playerId}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/[0.04]">
                                      <span className="w-6 font-display text-gold">{l.player.number || "–"}</span>
                                      <span className="flex-1">
                                        {l.player.firstName} {l.player.lastName}
                                      </span>
                                      <span className="text-[10px] uppercase tracking-[0.14em] text-ivory/35">{l.starter ? l.player.position : "Sub"}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </FadeIn>
                  )}
                  {m.report && (
                    <FadeIn>
                      <div className="ivory-card p-8">
                        <div className="eyebrow mb-4 text-gold-700">Match report</div>
                        <div className="prose-luxe">
                          {m.report.split(/\n+/).map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      </div>
                    </FadeIn>
                  )}
                </>
              ) : (
                <MembersLock title="Unlock the full match centre" signedIn={!!user} />
              ))}
            {!played && (
              <div className="panel p-8">
                <div className="eyebrow mb-3">Match preview</div>
                <p className="font-serif text-2xl leading-snug">
                  {h?.name ?? "To be decided"} meet {a?.name ?? "to be decided"} on {fmtLong(m.kickoff)} at {fmtTime(m.kickoff)}.
                </p>
                <p className="mt-3 text-sm text-ivory/55">
                  {m.venue ? `${m.venue.name}, ${m.venue.area}${m.venue.address ? ` (${m.venue.address})` : ""}.` : ""} Team sheets are submitted thirty minutes before kick-off. This page updates live once the match begins.
                </p>
              </div>
            )}
            {h2h.length > 0 && (
              <div className="panel p-6">
                <div className="eyebrow mb-4">Previous meetings</div>
                {h2h.map((x) => (
                  <FixtureRow key={x.id} m={x} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-8">
            {played && (
              <div className="panel p-6">
                <div className="eyebrow mb-5">Match statistics</div>
                {[
                  { l: "Goals", hv: m.homeScore ?? 0, av: m.awayScore ?? 0 },
                  { l: "Yellow cards", hv: count(h?.id, ["YELLOW"]), av: count(a?.id, ["YELLOW"]) },
                  { l: "Red cards", hv: count(h?.id, ["RED", "SECOND_YELLOW"]), av: count(a?.id, ["RED", "SECOND_YELLOW"]) },
                  { l: "Substitutions", hv: count(h?.id, ["SUB"]), av: count(a?.id, ["SUB"]) },
                ].map((s) => {
                  const tot = Math.max(1, s.hv + s.av);
                  return (
                    <div key={s.l} className="mb-4">
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-display">{s.hv}</span>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-ivory/45">{s.l}</span>
                        <span className="font-display">{s.av}</span>
                      </div>
                      <div className="flex h-1.5 gap-1">
                        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="bar-grow h-full rounded-full [transform-origin:right]" style={{ width: `${(s.hv / tot) * 100}%`, background: h?.primaryColor }} />
                        </div>
                        <div className="flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                          <div className="bar-grow h-full rounded-full" style={{ width: `${(s.av / tot) * 100}%`, background: a?.primaryColor === "#0D0D0D" ? "#F2F2F2" : a?.primaryColor }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {m.attendance && <div className="mt-6 border-t border-white/[0.06] pt-4 text-sm text-ivory/55">Attendance: {m.attendance.toLocaleString()}</div>}
              </div>
            )}
            {played && (
              <div className="panel p-6">
                <div className="eyebrow mb-4">Fans&apos; player of the match</div>
                {!member ? (
                  <p className="text-sm text-ivory/55">
                    Members vote for the fans&apos; player of the match. <Link href="/membership" className="text-gold hover:underline">Become a member</Link>
                  </p>
                ) : (
                  <div className="space-y-5">
                    {voteOpen ? (
                      <VoteForm action={voteMatchAction} teams={voteTeams} hidden={{ matchId: m.id }} current={mine} label="Vote" />
                    ) : (
                      <p className="text-xs text-ivory/45">Voting has closed for this match.</p>
                    )}
                    <VoteResults rows={voteRows} mine={mine} limit={5} />
                  </div>
                )}
              </div>
            )}
            {m.potm && member && (
              <Link href={`/players/${m.potm.id}`} className="group relative block overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent p-6">
                <div className="eyebrow">Player of the match</div>
                <div className="mt-3 font-serif text-3xl group-hover:text-gold-300">
                  {m.potm.firstName} {m.potm.lastName}
                </div>
                <div className="mt-1 text-sm text-ivory/55">
                  #{m.potm.number || "–"} · {m.potm.teamId === h?.id ? h?.name : a?.name}
                </div>
              </Link>
            )}
            {tableRows.length > 0 && (
              <div className="panel p-4">
                <div className="eyebrow mb-2 px-2 pt-2">{m.stage === "GROUP" ? m.group?.name : "Standings"}</div>
                <StandingsTable rows={tableRows} compact highlight={m.homeTeamId ?? undefined} zones={m.stage === "LEAGUE"} qualify={m.stage === "GROUP" ? 2 : 0} />
              </div>
            )}
            <div className="text-xs text-ivory/35">Stage: {STAGE_LABEL[m.stage]}</div>
          </aside>
        </div>
      </section>
      <div className="container-x pt-10">
        <SectionHeading title="" action={{ href: "/fixtures", label: "Back to all fixtures" }} className="mb-0" />
      </div>
    </>
  );
}

function EventText({ e, name }: { e: { type: string; player: { firstName: string; lastName: string } | null; assist: { firstName: string; lastName: string } | null; playerOff: { firstName: string; lastName: string } | null }; name: (p?: { firstName: string; lastName: string } | null) => string }) {
  const icon =
    e.type === "YELLOW" ? <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-yellow-400" /> :
    e.type === "RED" || e.type === "SECOND_YELLOW" ? <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-crimson" /> :
    e.type === "SUB" ? <Icon name="arrowRight" size={14} className="text-emerald-400" /> :
    <Icon name="ball" size={14} className="text-gold" />;
  return (
    <div className="inline-flex flex-col py-2">
      <span className="inline-flex items-center gap-2 text-sm font-semibold">
        {icon} {e.type === "SUB" ? `${name(e.player)} on` : name(e.player)}
      </span>
      <span className="text-xs text-ivory/45">
        {EV_LABEL[e.type]}
        {e.assist ? ` · assist ${name(e.assist)}` : ""}
        {e.type === "SUB" && e.playerOff ? ` · ${name(e.playerOff)} off` : ""}
      </span>
    </div>
  );
}
