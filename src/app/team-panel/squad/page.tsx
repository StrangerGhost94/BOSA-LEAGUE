import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getPlayerStats } from "@/lib/data";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { PlayerForm, PlayerStatusForm } from "@/components/admin/player-forms";
import { Pill } from "@/components/ui";

export const metadata = { title: "Squad" };

export default async function Squad() {
  const u = await requireRole(["TEAM_MANAGER"]);
  if (!u.teamId) return null;
  const players = await db.query.players.findMany({ where: eq(s.players.teamId, u.teamId), orderBy: [asc(s.players.number)] });
  const stats = Object.fromEntries((await getPlayerStats({ teamId: u.teamId, includePending: true })).map((p) => [p.id, p]));
  return (
    <>
      <PageHeader eyebrow={`${players.length} players`} title="Squad & availability">
        <Drawer label="Register player" title="Register a player" description="New registrations are sent to the League office for approval." icon="plus">
          <PlayerForm fixedTeam />
        </Drawer>
      </PageHeader>
      <div className="panel overflow-x-auto p-2 scrollbar-none">
        <table className="table-luxe min-w-[760px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Pos</th>
              <th className="text-center">Apps</th>
              <th className="text-center">Goals</th>
              <th className="text-center">Cards</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td className="font-display text-gold">{p.number}</td>
                <td>
                  <div className="font-semibold">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-ivory/45">{p.affiliation === "ALUMNI" ? "Alumni" : "Student"}{p.course ? ` · ${p.course}` : ""}</div>
                </td>
                <td className="text-xs">{p.position}</td>
                <td className="text-center">{stats[p.id]?.apps ?? 0}</td>
                <td className="text-center">{stats[p.id]?.goals ?? 0}</td>
                <td className="text-center text-xs">
                  {stats[p.id]?.yellows ?? 0}Y {stats[p.id]?.reds ?? 0}R
                </td>
                <td>
                  <Pill tone={p.status === "ACTIVE" ? "emerald" : p.status === "SUSPENDED" || p.status === "REJECTED" ? "crimson" : "gold"}>{p.status === "PENDING" ? "Awaiting approval" : p.status}</Pill>
                  {p.statusNote && <div className="mt-1 text-[11px] text-ivory/45">{p.statusNote}</div>}
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    {p.status !== "PENDING" && p.status !== "SUSPENDED" && p.status !== "REJECTED" && (
                      <Drawer label="Availability" title={`${p.firstName} ${p.lastName}`} buttonClass="btn-quiet btn-sm" side="center">
                        <PlayerStatusForm player={p} allowSuspend={false} />
                      </Drawer>
                    )}
                    <Drawer label="Edit" title={`Edit ${p.firstName} ${p.lastName}`} buttonClass="btn-ghost btn-sm">
                      <PlayerForm player={p} fixedTeam />
                    </Drawer>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
