import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getMatches } from "@/lib/data";
import { PageHeader } from "@/components/panel-shell";
import { Crest, EmptyState, StatusBadge } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";

export default async function RefHome() {
  const u = await requireRole(["REFEREE"]);
  const ms = await getMatches({ refereeId: u.id });
  const upcoming = ms.filter((m) => m.status !== "FULL_TIME" && m.status !== "CANCELLED");
  const done = ms.filter((m) => m.status === "FULL_TIME").reverse().slice(0, 20);
  const List = ({ list }: { list: typeof ms }) => (
    <>
      {list.map((m) => (
        <Link key={m.id} href={`/referee/matches/${m.id}`} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.04]">
          <span className="text-xs">
            <span className="block text-gold">{fmtDate(m.kickoff, { day: "numeric", month: "short" })}</span>
            <span className="text-ivory/45">{fmtTime(m.kickoff)}</span>
          </span>
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Crest team={m.homeTeam} size={22} /> <span className="truncate">{m.homeTeam?.name ?? "TBD"}</span>
            <span className="font-display text-ivory/50">{m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "v"}</span>
            <span className="truncate">{m.awayTeam?.name ?? "TBD"}</span> <Crest team={m.awayTeam} size={22} />
          </span>
          <StatusBadge status={m.status} minute={m.minute} />
        </Link>
      ))}
    </>
  );
  return (
    <>
      <PageHeader eyebrow={`Welcome, ${u.name}`} title="My appointments" />
      {ms.length === 0 && <EmptyState title="No appointments yet" body="Matches appear here when the League office appoints you." />}
      {upcoming.length > 0 && (
        <div className="panel p-3">
          <div className="eyebrow px-3 py-2">Upcoming ({upcoming.length})</div>
          <List list={upcoming} />
        </div>
      )}
      {done.length > 0 && (
        <div className="panel mt-6 p-3">
          <div className="eyebrow px-3 py-2">Officiated</div>
          <List list={done} />
        </div>
      )}
    </>
  );
}
