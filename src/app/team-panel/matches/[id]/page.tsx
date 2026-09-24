import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getMatch } from "@/lib/data";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Submit } from "@/components/form";
import { Crest, Icon, StatusBadge } from "@/components/ui";
import { saveLineupAction } from "@/app/actions/admin";
import { fmtLong, fmtTime } from "@/lib/format";
import clsx from "clsx";

export default async function TeamSheet({ params }: { params: { id: string } }) {
  const u = await requireRole(["TEAM_MANAGER"]);
  const m = await getMatch(params.id);
  if (!m || !u.teamId || (m.homeTeamId !== u.teamId && m.awayTeamId !== u.teamId)) notFound();
  const players = await db.query.players.findMany({ where: and(eq(s.players.teamId, u.teamId), notInArray(s.players.status, ["PENDING", "REJECTED"])), orderBy: asc(s.players.number) });
  const lu = new Map(m.lineups.filter((l) => l.teamId === u.teamId).map((l) => [l.playerId, l.starter]));
  const locked = m.status === "FULL_TIME";
  return (
    <>
      <Link href="/team-panel/matches" className="mb-4 inline-flex items-center gap-1 text-sm text-ivory/50 hover:text-gold">
        <Icon name="arrowLeft" size={14} /> All fixtures
      </Link>
      <PageHeader eyebrow={`${m.season.competition.name} · ${m.round}`} title="Team sheet" />
      <div className="panel mb-6 flex flex-wrap items-center gap-4 p-5">
        <Crest team={m.homeTeam} size={44} />
        <span className="font-serif text-xl">{m.homeTeam?.name}</span>
        <span className="font-display text-2xl">{m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "v"}</span>
        <span className="font-serif text-xl">{m.awayTeam?.name}</span>
        <Crest team={m.awayTeam} size={44} />
        <span className="ml-auto text-sm text-ivory/55">
          {fmtLong(m.kickoff)} · {fmtTime(m.kickoff)} · {m.venue?.name}
        </span>
        <StatusBadge status={m.status} />
      </div>
      <div className="panel p-6">
        <p className="mb-5 text-sm text-ivory/55">Select up to eleven starters and your substitutes. Suspended players cannot be selected.{locked && " This sheet is locked because the match has finished."}</p>
        <ActionForm action={saveLineupAction}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="teamId" value={u.teamId} />
          <div className="mb-2 grid grid-cols-[1fr_72px_72px] px-2 text-[10px] uppercase tracking-[0.16em] text-ivory/40">
            <span>Player</span>
            <span className="text-center">Start</span>
            <span className="text-center">Bench</span>
          </div>
          {players.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_72px_72px] items-center rounded-lg px-2 py-2 text-sm hover:bg-white/[0.03]">
              <span className={clsx(p.status === "SUSPENDED" && "text-crimson-400 line-through", p.status === "INJURED" && "text-gold")}>
                <span className="mr-2 inline-block w-6 font-display text-ivory/50">{p.number || "–"}</span>
                {p.firstName} {p.lastName} <span className="text-[10px] text-ivory/35">{p.position}</span>
                {p.status !== "ACTIVE" && <span className="ml-2 text-[10px] uppercase">{p.status.toLowerCase()}</span>}
              </span>
              <input type="checkbox" name="starter" value={p.id} defaultChecked={lu.get(p.id) === true} disabled={locked || p.status === "SUSPENDED"} className="mx-auto h-4 w-4 accent-[#D6B676]" aria-label={`Start ${p.firstName}`} />
              <input type="checkbox" name="sub" value={p.id} defaultChecked={lu.get(p.id) === false} disabled={locked || p.status === "SUSPENDED"} className="mx-auto h-4 w-4 accent-[#1E8C6B]" aria-label={`Bench ${p.firstName}`} />
            </div>
          ))}
          {!locked && <Submit className="btn-primary mt-6">Submit team sheet</Submit>}
        </ActionForm>
      </div>
    </>
  );
}
