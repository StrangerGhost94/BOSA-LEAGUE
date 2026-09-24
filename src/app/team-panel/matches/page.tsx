import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getMatches } from "@/lib/data";
import { PageHeader } from "@/components/panel-shell";
import { Crest, StatusBadge } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { pool } from "@/db";

export const metadata = { title: "Fixtures & team sheets" };

export default async function TeamMatches() {
  const u = await requireRole(["TEAM_MANAGER"]);
  if (!u.teamId) return null;
  const ms = await getMatches({ teamId: u.teamId });
  const { rows } = await pool.query("select match_id, count(*)::int c from lineups where team_id=$1 group by match_id", [u.teamId]);
  const sheets = Object.fromEntries(rows.map((r: { match_id: string; c: number }) => [r.match_id, r.c]));
  const upcoming = ms.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED");
  const done = ms.filter((m) => m.status === "FULL_TIME").reverse();
  const Row = ({ m }: { m: (typeof ms)[number] }) => (
    <Link href={`/team-panel/matches/${m.id}`} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.04]">
      <span className="text-xs">
        <span className="block text-gold">{fmtDate(m.kickoff, { day: "numeric", month: "short" })}</span>
        <span className="text-ivory/45">{fmtTime(m.kickoff)}</span>
      </span>
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Crest team={m.homeTeam} size={22} /> <span className="truncate">{m.homeTeam?.name ?? "TBD"}</span>
        <span className="font-display text-ivory/50">{m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "v"}</span>
        <span className="truncate">{m.awayTeam?.name ?? "TBD"}</span> <Crest team={m.awayTeam} size={22} />
        <span className="ml-2 hidden text-[10px] uppercase tracking-[0.14em] text-ivory/35 md:inline">{m.season.competition.shortName}</span>
      </span>
      <span className="flex items-center gap-2">
        {m.status !== "FULL_TIME" && <span className={sheets[m.id] ? "text-xs text-emerald-400" : "text-xs text-crimson-400"}>{sheets[m.id] ? "Sheet submitted" : "Sheet due"}</span>}
        <StatusBadge status={m.status} />
      </span>
    </Link>
  );
  return (
    <>
      <PageHeader eyebrow="Submit your team sheet before kick-off" title="Fixtures & team sheets" />
      <div className="panel p-3">
        <div className="eyebrow px-3 py-2">Upcoming</div>
        {upcoming.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </div>
      <div className="panel mt-6 p-3">
        <div className="eyebrow px-3 py-2">Results</div>
        {done.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </div>
    </>
  );
}
