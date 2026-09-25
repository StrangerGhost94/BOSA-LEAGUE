import { notFound } from "next/navigation";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { getMatch } from "@/lib/data";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveControls } from "@/components/live-desk/live-controls";

/** One match on the Live Desk: loads the squads and events and hands them to the controls. */
export async function LiveDeskMatchView({ id, base }: { id: string; base: string }) {
  const m = await getMatch(id);
  if (!m || !m.homeTeam || !m.awayTeam) notFound();
  const squad = (teamId: string) =>
    db.query.players.findMany({
      where: and(eq(s.players.teamId, teamId), notInArray(s.players.status, ["PENDING", "REJECTED"])),
      orderBy: [asc(s.players.number), asc(s.players.lastName)],
    });
  const [hp, ap] = await Promise.all([squad(m.homeTeam.id), squad(m.awayTeam.id)]);
  const side = (t: NonNullable<typeof m.homeTeam>, ps: typeof hp) => ({
    id: t.id,
    name: t.name,
    short: t.shortName,
    color: t.primaryColor,
    crest: t.crest,
    players: ps.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim(), number: p.number, suspended: p.status === "SUSPENDED" })),
  });
  const events = [...m.events]
    .sort((a, b) => b.minute - a.minute || +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((e) => ({
      id: e.id,
      type: e.type,
      minute: e.minute,
      teamId: e.teamId,
      player: e.player ? `${e.player.firstName} ${e.player.lastName}` : null,
    }));
  return (
    <>
      <AutoRefresh seconds={20} enabled={m.status === "LIVE" || m.status === "HALF_TIME"} />
      <LiveControls
        match={{ id: m.id, round: m.round, status: m.status, minute: m.minute, clockAt: m.clockAt ? m.clockAt.toISOString() : null, homeScore: m.homeScore, awayScore: m.awayScore, kickoff: m.kickoff.toISOString() }}
        home={side(m.homeTeam, hp)}
        away={side(m.awayTeam, ap)}
        events={events}
        base={base}
      />
    </>
  );
}
