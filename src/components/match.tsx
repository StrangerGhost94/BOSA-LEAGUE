import Link from "next/link";
import clsx from "clsx";
import { Crest, FormPills, Icon, StatusBadge } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import type { TableRow } from "@/lib/data";

type T = { id: string; name: string; shortName: string; crest: string; primaryColor: string; slug: string } | null;
export type MatchCardData = {
  id: string;
  kickoff: Date;
  status: string;
  minute: number | null;
  round: string;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
  homeTeam: T;
  awayTeam: T;
  venue: { name: string; area: string } | null;
  season?: { competition: { name: string; shortName: string; type: string } } | null;
};

const isPlayed = (s: string) => ["FULL_TIME", "LIVE", "HALF_TIME"].includes(s);

export function MatchCard({ m, variant = "dark", showComp = true }: { m: MatchCardData; variant?: "dark" | "ivory"; showComp?: boolean }) {
  const played = isPlayed(m.status);
  const light = variant === "ivory";
  const hWin = m.status === "FULL_TIME" && (m.homeScore! > m.awayScore! || (m.homeScore === m.awayScore && (m.homePens ?? 0) > (m.awayPens ?? 0)));
  const aWin = m.status === "FULL_TIME" && (m.awayScore! > m.homeScore! || (m.homeScore === m.awayScore && (m.awayPens ?? 0) > (m.homePens ?? 0)));
  return (
    <Link
      href={`/matches/${m.id}`}
      className={clsx(
        "group relative block overflow-hidden rounded-2xl border p-5 transition-all duration-500 hover:-translate-y-1",
        light
          ? "border-night-800/10 bg-ivory text-night-800 hover:shadow-[0_30px_60px_-30px_rgba(6,9,19,.55)]"
          : "border-white/[0.07] bg-night-800/70 hover:border-gold/30 hover:shadow-[0_30px_80px_-30px_rgba(204,38,84,.45)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `radial-gradient(60% 80% at 0% 50%, ${m.homeTeam?.primaryColor ?? "#CC2654"}22, transparent 60%), radial-gradient(60% 80% at 100% 50%, ${m.awayTeam?.primaryColor ?? "#D6B676"}22, transparent 60%)`,
        }}
      />
      <div className="relative flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
        <span className={light ? "text-night-600/60" : "text-ivory/45"}>
          {showComp && m.season ? `${m.season.competition.shortName} · ` : ""}
          {m.round}
        </span>
        {played || m.status !== "SCHEDULED" ? <StatusBadge status={m.status} minute={m.minute} /> : <span className={light ? "text-crimson" : "text-gold"}>{fmtDate(m.kickoff)}</span>}
      </div>
      <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide team={m.homeTeam} win={hWin} light={light} />
        <div className="text-center">
          {played ? (
            <div className="font-display text-4xl font-semibold tabular-nums tracking-tight">
              {m.homeScore}
              <span className={light ? "mx-1.5 text-night-800/25" : "mx-1.5 text-ivory/25"}>:</span>
              {m.awayScore}
            </div>
          ) : (
            <div className={clsx("rounded-full border px-3.5 py-1.5 font-display text-lg tabular-nums", light ? "border-night-800/15" : "border-gold/25 text-gold")}>
              {fmtTime(m.kickoff)}
            </div>
          )}
          {m.homePens != null && m.awayPens != null && <div className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-60">Pens {m.homePens}-{m.awayPens}</div>}
        </div>
        <TeamSide team={m.awayTeam} win={aWin} light={light} right />
      </div>
      <div
        className={clsx(
          "relative mt-5 flex items-center justify-between border-t pt-3 text-xs transition-all duration-500",
          light ? "border-night-800/10 text-night-600/70" : "border-white/[0.06] text-ivory/45",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Icon name="pin" size={13} /> {m.venue ? `${m.venue.name}, ${m.venue.area}` : "Venue to be confirmed"}
        </span>
        <span className={clsx("flex translate-x-2 items-center gap-1 font-semibold opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100", light ? "text-crimson" : "text-gold")}>
          Match centre <Icon name="arrowRight" size={13} />
        </span>
      </div>
    </Link>
  );
}

function TeamSide({ team, win, light }: { team: T; win: boolean; light: boolean; right?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2.5 text-center">
      <Crest team={team} size={52} className="transition-transform duration-500 group-hover:scale-110" />
      <div className="w-full min-w-0">
        <div className={clsx("truncate font-semibold leading-tight", win && (light ? "text-night-900" : "text-ivory"), !win && (light ? "text-night-700" : "text-ivory/85"))}>
          {team?.name ?? "To be decided"}
        </div>
        <div className={clsx("text-[10px] uppercase tracking-[0.16em]", light ? "text-night-600/50" : "text-ivory/35")}>{team?.shortName ?? "TBD"}</div>
      </div>
    </div>
  );
}

/** Compact one-line fixture row used in timelines */
export function FixtureRow({ m }: { m: MatchCardData }) {
  const played = isPlayed(m.status);
  return (
    <Link
      href={`/matches/${m.id}`}
      className="group relative grid grid-cols-[56px_1fr_auto_1fr_28px] items-center gap-3 rounded-xl px-3 py-3.5 transition hover:bg-white/[0.04] sm:grid-cols-[72px_1fr_auto_1fr_120px_28px]"
    >
      <span className="font-display text-sm tabular-nums text-gold">{fmtTime(m.kickoff)}</span>
      <span className="flex min-w-0 items-center justify-end gap-2.5 text-right">
        <span className="truncate text-sm font-medium">{m.homeTeam?.name ?? "TBD"}</span>
        <Crest team={m.homeTeam} size={30} />
      </span>
      <span className={clsx("min-w-[64px] rounded-lg px-2 py-1 text-center font-display text-lg tabular-nums", played ? "bg-white/[0.06]" : "text-ivory/35")}>
        {played ? `${m.homeScore} - ${m.awayScore}` : "vs"}
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <Crest team={m.awayTeam} size={30} />
        <span className="truncate text-sm font-medium">{m.awayTeam?.name ?? "TBD"}</span>
      </span>
      <span className="hidden justify-end sm:flex">
        <StatusBadge status={m.status} minute={m.minute} />
      </span>
      <Icon name="arrowRight" size={14} className="text-ivory/25 transition group-hover:translate-x-1 group-hover:text-gold" />
    </Link>
  );
}

export function StandingsTable({
  rows,
  compact = false,
  highlight,
  zones = true,
  qualify = 0,
}: {
  rows: TableRow[];
  compact?: boolean;
  highlight?: string;
  zones?: boolean;
  qualify?: number;
}) {
  return (
    <div className="overflow-x-auto scrollbar-none">
      <table className="table-luxe min-w-[560px]">
        <thead>
          <tr>
            <th className="w-10 text-center">Pos</th>
            <th>Club</th>
            <th className="text-center">P</th>
            {!compact && <th className="text-center">W</th>}
            {!compact && <th className="text-center">D</th>}
            {!compact && <th className="text-center">L</th>}
            {!compact && <th className="text-center">GF</th>}
            {!compact && <th className="text-center">GA</th>}
            <th className="text-center">GD</th>
            <th className="text-center">Pts</th>
            {!compact && <th className="hidden md:table-cell">Form</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const leader = zones && r.position === 1;
            const q = qualify && r.position <= qualify;
            return (
              <tr
                key={r.teamId}
                className={clsx("row-in group transition-colors hover:bg-white/[0.035]", highlight === r.teamId && "bg-gold/[0.06]")}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <td className="relative text-center font-display text-base tabular-nums">
                  <span
                    className={clsx(
                      "absolute left-0 top-2 bottom-2 w-[3px] rounded-full",
                      leader ? "bg-gradient-to-b from-gold-300 to-gold-600" : q ? "bg-emerald" : "bg-transparent",
                    )}
                  />
                  <span className={leader ? "text-gold" : "text-ivory/70"}>{r.position}</span>
                </td>
                <td>
                  <Link href={`/teams/${r.team.slug}`} className="flex items-center gap-3">
                    <Crest team={r.team} size={30} className="transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-semibold text-ivory transition group-hover:text-gold">{compact ? r.team.shortName : r.team.name}</span>
                    {r.live && <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-crimson-400" title="Live" />}
                  </Link>
                </td>
                <td className="text-center tabular-nums text-ivory/70">{r.played}</td>
                {!compact && <td className="text-center tabular-nums text-ivory/70">{r.won}</td>}
                {!compact && <td className="text-center tabular-nums text-ivory/70">{r.drawn}</td>}
                {!compact && <td className="text-center tabular-nums text-ivory/70">{r.lost}</td>}
                {!compact && <td className="text-center tabular-nums text-ivory/70">{r.goalsFor}</td>}
                {!compact && <td className="text-center tabular-nums text-ivory/70">{r.goalsAgainst}</td>}
                <td className={clsx("text-center tabular-nums", r.goalDifference > 0 ? "text-emerald-400" : r.goalDifference < 0 ? "text-crimson-400" : "text-ivory/60")}>
                  {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                </td>
                <td className="text-center">
                  <span className={clsx("inline-block min-w-[2.2rem] rounded-md px-2 py-0.5 font-display text-base font-semibold tabular-nums", leader ? "bg-gold text-night-900" : "bg-white/[0.06] text-ivory")}>
                    {r.points}
                  </span>
                </td>
                {!compact && (
                  <td className="hidden md:table-cell">
                    <FormPills form={r.form} size="sm" />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
