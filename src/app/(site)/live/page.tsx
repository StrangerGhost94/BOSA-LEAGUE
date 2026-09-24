import Link from "next/link";
import { and, asc, gte, inArray, lte, or } from "drizzle-orm";
import clsx from "clsx";
import { db } from "@/db";
import * as s from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { MembersNav } from "@/components/members-nav";
import { MembersLock } from "@/components/members-lock";
import { AnimatedScore } from "@/components/motion";
import { Crest, EmptyState, Icon, StatusBadge } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { dayKey, fmtLong, fmtTime, liveMinute } from "@/lib/format";

export const metadata = { title: "Live centre" };

const EV: Record<string, string> = { GOAL: "Goal", PENALTY_GOAL: "Penalty goal", OWN_GOAL: "Own goal", PENALTY_MISS: "Penalty missed", YELLOW: "Yellow card", SECOND_YELLOW: "Second yellow", RED: "Red card", SUB: "Substitution" };

export default async function LivePage() {
  const u = await getCurrentUser();
  const member = hasMembership(u);
  const today = dayKey(new Date());
  const start = new Date(`${today}T00:00:00+03:00`);
  const end = new Date(`${today}T23:59:59+03:00`);
  const todays = await db.query.matches.findMany({
    // Today's games, plus anything live right now (even if it kicked off on another day)
    where: or(and(gte(s.matches.kickoff, start), lte(s.matches.kickoff, end)), inArray(s.matches.status, ["LIVE", "HALF_TIME"])),
    with: {
      homeTeam: true,
      awayTeam: true,
      venue: true,
      season: { with: { competition: true } },
      events: { with: { player: true, assist: true, playerOff: true }, orderBy: asc(s.matchEvents.minute) },
    },
    orderBy: asc(s.matches.kickoff),
  });
  const live = todays.some((m) => m.status === "LIVE" || m.status === "HALF_TIME");
  const next = todays.length
    ? null
    : await db.query.matches.findFirst({ where: and(gte(s.matches.kickoff, new Date()), inArray(s.matches.status, ["SCHEDULED"])), with: { homeTeam: true, awayTeam: true }, orderBy: asc(s.matches.kickoff) });
  const name = (p?: { firstName: string; lastName: string } | null) => (p ? `${p.firstName} ${p.lastName}`.trim() : "Unknown");

  return (
    <section className="container-x pt-24 sm:pt-32">
      {member && <AutoRefresh enabled seconds={live ? 10 : 60} />}
      <MembersNav active="/live" />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2">
            {live && <span className="h-2 w-2 animate-pulseDot rounded-full bg-crimson-400" />}
            {live ? "Live now" : "Live centre"}
          </div>
          <h1 className="headline mt-3 text-5xl sm:text-6xl">{todays.length ? fmtLong(todays[todays.length - 1].kickoff) : "Matchday live"}</h1>
        </div>
        {member && todays.length > 0 && <div className="text-xs text-ivory/45">Updates automatically every {live ? "10 seconds" : "minute"}</div>}
      </div>

      {!member ? (
        <div className="mt-10">
          <MembersLock title="Follow every match live" body="Members follow every Sunday game minute by minute: goals, cards and substitutions as they happen, with scores that update by themselves." signedIn={!!u} />
        </div>
      ) : todays.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No matches today"
            body={next ? `Next up: ${next.homeTeam?.name ?? "TBD"} v ${next.awayTeam?.name ?? "TBD"}, ${fmtLong(next.kickoff)} at ${fmtTime(next.kickoff)}.` : "The next fixtures will appear here on matchday."}
            action={next ? <div className="flex justify-center"><Countdown to={next.kickoff.toISOString()} /></div> : undefined}
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {todays.map((m) => {
            const isLive = m.status === "LIVE" || m.status === "HALF_TIME";
            const shown = m.homeScore != null && m.status !== "SCHEDULED";
            const feed = [...m.events].reverse();
            return (
              <div key={m.id} className={clsx("panel overflow-hidden", isLive && "border-crimson/40 shadow-[0_0_60px_-20px_rgba(204,38,84,.6)]")}>
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 text-xs">
                  <span className="text-ivory/50">
                    {fmtTime(m.kickoff)} · {m.season.competition.shortName} · {m.round}
                  </span>
                  <StatusBadge status={m.status} minute={liveMinute(m)} />
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Crest team={m.homeTeam} size={54} />
                    <span className="font-semibold">{m.homeTeam?.name ?? "TBD"}</span>
                  </div>
                  <div className="text-center">
                    {shown ? (
                      <div className="font-display text-5xl tabular-nums">
                        <AnimatedScore value={m.homeScore} /> <span className="text-ivory/25">:</span> <AnimatedScore value={m.awayScore} />
                      </div>
                    ) : (
                      <div className="font-display text-3xl text-gold">{fmtTime(m.kickoff)}</div>
                    )}
                    {isLive && m.minute != null && <div className="mt-1 font-display text-crimson-400">{m.status === "HALF_TIME" ? "HT" : `${liveMinute(m)}'`}</div>}
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Crest team={m.awayTeam} size={54} />
                    <span className="font-semibold">{m.awayTeam?.name ?? "TBD"}</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto border-t border-white/[0.06] px-5 py-3" data-lenis-prevent>
                  {feed.length === 0 && <p className="py-2 text-sm text-ivory/40">{m.status === "SCHEDULED" ? "Kick-off at " + fmtTime(m.kickoff) : "No events yet."}</p>}
                  <ol className="space-y-2">
                    {feed.map((e) => (
                      <li key={e.id} className="flex items-start gap-3 text-sm">
                        <span className="w-9 shrink-0 font-display text-gold">{e.minute}&apos;</span>
                        <Crest team={e.teamId === m.homeTeamId ? m.homeTeam : m.awayTeam} size={18} />
                        <span>
                          <span className="font-semibold">{EV[e.type]}</span> · {e.type === "SUB" ? `${name(e.player)} on for ${name(e.playerOff)}` : name(e.player)}
                          {e.assist && <span className="text-ivory/50"> (assist {name(e.assist)})</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <Link href={`/matches/${m.id}`} className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-sm text-gold hover:bg-white/[0.03]">
                  Full match centre and vote <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
