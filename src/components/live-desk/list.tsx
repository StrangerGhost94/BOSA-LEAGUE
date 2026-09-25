import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Crest } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";
import { fmtDate, fmtTime, liveMinute } from "@/lib/format";

type M = Awaited<ReturnType<typeof load>>["next"][number];

const TZ = "Africa/Kampala";
const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/**
 * What the desk shows always follows the calendar, with nothing to set by hand:
 * - live matches;
 * - the next matchday: every match on the next day that has one, however far away (next Sunday, after a break,
 *   the Champions League, the Super Cup). When the last match of a day ends, the following matchday appears;
 * - earlier matches that were never started (so a missed one isn't lost);
 * - matches finished in the last two days, for corrections.
 */
async function load() {
  const now = Date.now();
  const [active, upcoming, recent] = await Promise.all([
    db.query.matches.findMany({ where: inArray(s.matches.status, ["LIVE", "HALF_TIME"]), with: { homeTeam: true, awayTeam: true }, orderBy: asc(s.matches.kickoff) }),
    db.query.matches.findMany({
      where: and(eq(s.matches.status, "SCHEDULED"), gte(s.matches.kickoff, new Date(now - 7 * 86_400_000))),
      with: { homeTeam: true, awayTeam: true },
      orderBy: asc(s.matches.kickoff),
      limit: 60,
    }),
    db.query.matches.findMany({
      where: and(eq(s.matches.status, "FULL_TIME"), gte(s.matches.kickoff, new Date(now - 2 * 86_400_000)), lte(s.matches.kickoff, new Date(now))),
      with: { homeTeam: true, awayTeam: true },
      orderBy: desc(s.matches.kickoff),
    }),
  ]);
  // A match still "not started" 12 hours after kick-off was missed; everything else counts as upcoming
  const missedBefore = now - 12 * 3_600_000;
  const missed = upcoming.filter((m) => m.kickoff.getTime() < missedBefore);
  const ahead = upcoming.filter((m) => m.kickoff.getTime() >= missedBefore);
  const nextDay = ahead[0] ? dayOf(ahead[0].kickoff) : null;
  const next = ahead.filter((m) => dayOf(m.kickoff) === nextDay);
  const later = ahead.find((m) => dayOf(m.kickoff) !== nextDay) ?? null;
  return { active, next, missed, recent, later };
}

function Card({ m, base }: { m: M; base: string }) {
  const live = m.status === "LIVE" || m.status === "HALF_TIME";
  const done = m.status === "FULL_TIME";
  // Knock-out ties wait for earlier results before their teams are known
  const ready = !!(m.homeTeamId && m.awayTeamId);
  const Wrap = ({ children }: { children: React.ReactNode }) =>
    ready ? (
      <Link href={`${base}/${m.id}`} className={`block rounded-2xl border p-4 transition active:scale-[0.99] ${live ? "border-crimson/50 bg-crimson/10" : "border-white/[0.08] bg-night-800/70"}`}>
        {children}
      </Link>
    ) : (
      <div className="block rounded-2xl border border-dashed border-white/[0.1] p-4 opacity-60">{children}</div>
    );
  return (
    <Wrap>
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-ivory/50">
          {m.round} · {fmtDate(m.kickoff, { weekday: "short", day: "numeric", month: "short" })} {fmtTime(m.kickoff)}
        </span>
        {live ? (
          <span className="rounded-full bg-crimson px-2.5 py-0.5 font-semibold text-white">{m.status === "HALF_TIME" ? "HALF-TIME" : `LIVE ${liveMinute(m)}'`}</span>
        ) : done ? (
          <span className="text-ivory/40">Full time</span>
        ) : (
          <span className="text-gold">{ready ? "Not started" : "Waiting for earlier results"}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Crest team={m.homeTeam} size={30} />
          <span className="truncate font-semibold">{m.homeTeam?.name ?? "TBD"}</span>
        </span>
        <span className="font-display text-2xl tabular-nums">{m.homeScore != null ? `${m.homeScore} - ${m.awayScore}` : "v"}</span>
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right font-semibold">{m.awayTeam?.name ?? "TBD"}</span>
          <Crest team={m.awayTeam} size={30} />
        </span>
      </div>
    </Wrap>
  );
}

/** Matches to run: live now, coming up this week, and just finished (for corrections). */
export async function LiveDeskList({ base }: { base: string }) {
  const { active, next, missed, recent, later } = await load();
  const today = dayOf(new Date());
  const first = next[0];
  const nextTitle = first
    ? `${dayOf(first.kickoff) === today ? "Today" : fmtDate(first.kickoff, { weekday: "long", day: "numeric", month: "long" })} · ${first.matchday ? `Matchday ${first.matchday}` : first.round}`
    : "Next matchday";
  const Section = ({ title, list, empty, note }: { title: string; list: M[]; empty?: string; note?: string }) => (
    <section className="mb-7">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/40">{title}</h2>
      {list.length ? <div className="space-y-3">{list.map((m) => <Card key={m.id} m={m} base={base} />)}</div> : empty && <p className="text-sm text-ivory/40">{empty}</p>}
      {note && <p className="mt-3 text-xs text-ivory/40">{note}</p>}
    </section>
  );
  return (
    <>
      <AutoRefresh seconds={30} />
      <h1 className="mb-1 font-serif text-3xl">Matches</h1>
      <p className="mb-6 text-sm text-ivory/50">Tap a match to run it live: kick-off, goals, cards, half-time and full time. This list moves on to the next matchday by itself.</p>
      {active.length > 0 && <Section title="Live now" list={active} />}
      <Section
        title={nextTitle}
        list={next}
        empty="No more matches scheduled. The next ones appear here as soon as they are drawn."
        note={later ? `After that: ${fmtDate(later.kickoff, { weekday: "long", day: "numeric", month: "long" })}${later.matchday ? ` (Matchday ${later.matchday})` : ` (${later.round})`}.` : undefined}
      />
      {missed.length > 0 && <Section title="Not started (earlier dates)" list={missed} />}
      {recent.length > 0 && <Section title="Just finished (for corrections)" list={recent} />}
    </>
  );
}
