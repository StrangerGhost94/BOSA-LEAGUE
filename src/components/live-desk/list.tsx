import Link from "next/link";
import { and, asc, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { Crest } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";
import { fmtDate, fmtTime, liveMinute } from "@/lib/format";

type M = Awaited<ReturnType<typeof load>>[number];

async function load() {
  const now = Date.now();
  return db.query.matches.findMany({
    where: and(
      inArray(s.matches.status, ["SCHEDULED", "LIVE", "HALF_TIME", "FULL_TIME"]),
      gte(s.matches.kickoff, new Date(now - 2 * 86_400_000)),
      lte(s.matches.kickoff, new Date(now + 8 * 86_400_000)),
    ),
    with: { homeTeam: true, awayTeam: true },
    orderBy: asc(s.matches.kickoff),
  });
}

function Card({ m, base }: { m: M; base: string }) {
  const live = m.status === "LIVE" || m.status === "HALF_TIME";
  const done = m.status === "FULL_TIME";
  return (
    <Link
      href={`${base}/${m.id}`}
      className={`block rounded-2xl border p-4 transition active:scale-[0.99] ${live ? "border-crimson/50 bg-crimson/10" : "border-white/[0.08] bg-night-800/70"}`}
    >
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-ivory/50">
          {m.round} · {fmtDate(m.kickoff, { weekday: "short", day: "numeric", month: "short" })} {fmtTime(m.kickoff)}
        </span>
        {live ? (
          <span className="rounded-full bg-crimson px-2.5 py-0.5 font-semibold text-white">{m.status === "HALF_TIME" ? "HALF-TIME" : `LIVE ${liveMinute(m)}'`}</span>
        ) : done ? (
          <span className="text-ivory/40">Full time</span>
        ) : (
          <span className="text-gold">Not started</span>
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
    </Link>
  );
}

/** Matches to run: live now, coming up this week, and just finished (for corrections). */
export async function LiveDeskList({ base }: { base: string }) {
  const all = (await load()).filter((m) => m.homeTeamId && m.awayTeamId);
  const live = all.filter((m) => m.status === "LIVE" || m.status === "HALF_TIME");
  const next = all.filter((m) => m.status === "SCHEDULED");
  const done = all.filter((m) => m.status === "FULL_TIME").reverse();
  const Section = ({ title, list, empty }: { title: string; list: M[]; empty?: string }) => (
    <section className="mb-7">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/40">{title}</h2>
      {list.length ? <div className="space-y-3">{list.map((m) => <Card key={m.id} m={m} base={base} />)}</div> : empty && <p className="text-sm text-ivory/40">{empty}</p>}
    </section>
  );
  return (
    <>
      <AutoRefresh seconds={30} />
      <h1 className="mb-1 font-serif text-3xl">Matches</h1>
      <p className="mb-6 text-sm text-ivory/50">Tap a match to run it live: kick-off, goals, cards, half-time and full time.</p>
      <Section title="Live now" list={live} empty="No match is live right now." />
      <Section title="Coming up" list={next} empty="No matches in the next week." />
      {done.length > 0 && <Section title="Just finished (for corrections)" list={done} />}
    </>
  );
}
