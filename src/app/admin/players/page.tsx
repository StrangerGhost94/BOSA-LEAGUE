import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { FilterBar } from "@/components/filter-bar";
import { ActionForm, Submit } from "@/components/form";
import { PlayerForm, PlayerStatusForm } from "@/components/admin/player-forms";
import { EmptyState, Pill } from "@/components/ui";
import { reviewPlayerAction, deletePlayerAction } from "@/app/actions/admin";
import { getTeams } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Players" };

export default async function AdminPlayers({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const teams = await getTeams();
  const conds: SQL[] = [];
  if (searchParams.team) conds.push(eq(s.players.teamId, searchParams.team));
  if (searchParams.status) conds.push(eq(s.players.status, searchParams.status as s.PlayerStatus));
  if (searchParams.q) conds.push(or(ilike(s.players.firstName, `%${searchParams.q}%`), ilike(s.players.lastName, `%${searchParams.q}%`))!);
  const players = await db.query.players.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: { team: true },
    orderBy: [asc(s.players.status), asc(s.players.teamId), asc(s.players.number)],
    limit: 300,
  });
  const pending = players.filter((p) => p.status === "PENDING");
  const rest = players.filter((p) => p.status !== "PENDING");

  return (
    <>
      <PageHeader eyebrow="Registration · Approval · Availability" title="Players">
        <Drawer label="Register player" title="Register a player" icon="plus">
          <PlayerForm teams={teams} admin />
        </Drawer>
      </PageHeader>
      <FilterBar
        className="mb-8"
        filters={[
          { name: "q", label: "Search", type: "search", placeholder: "Player name" },
          { name: "team", label: "Club", type: "select", all: "All clubs", options: teams.map((t) => ({ value: t.id, label: t.name })) },
          { name: "status", label: "Status", type: "select", all: "Any status", options: ["PENDING", "ACTIVE", "INJURED", "SUSPENDED", "INACTIVE", "REJECTED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() })) },
        ]}
      />

      {pending.length > 0 && (
        <div className="mb-8 rounded-2xl border border-gold/30 bg-gold/[0.04] p-5">
          <div className="eyebrow mb-4">Awaiting approval ({pending.length})</div>
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-night-800/70 p-3">
                <img src={p.team.crest} alt="" className="h-9 w-9 rounded-full bg-white" />
                <div className="min-w-[200px] flex-1">
                  <div className="font-semibold">
                    {p.firstName} {p.lastName} <span className="text-ivory/40">#{p.number || "–"}{p.position ? ` · ${p.position}` : ""}</span>
                  </div>
                  <div className="text-xs text-ivory/50">
                    {p.team.name} · {p.completionYear ? `${p.completionYear} intake` : "Intake year not given"} · submitted {fmtDate(p.createdAt, { day: "numeric", month: "short" })}
                  </div>
                </div>
                <ActionForm action={reviewPlayerAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Submit className="btn-gold btn-sm">Approve</Submit>
                </ActionForm>
                <ActionForm action={reviewPlayerAction} confirm="Reject this registration?">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Submit className="btn-danger btn-sm">Reject</Submit>
                </ActionForm>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rest.length === 0 && pending.length === 0 && <EmptyState title="No players found" />}
      {rest.length > 0 && (
        <div className="panel overflow-x-auto p-2 scrollbar-none">
          <table className="table-luxe min-w-[900px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Club</th>
                <th>Pos</th>
                <th>Completed</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rest.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.03]">
                  <td className="font-display text-gold">{p.number || "–"}</td>
                  <td className="font-semibold">
                    {p.firstName} {p.lastName}
                  </td>
                  <td>
                    <span className="flex items-center gap-2 text-ivory/70">
                      <img src={p.team.crest} alt="" className="h-6 w-6 rounded-full bg-white" /> {p.team.name}
                    </span>
                  </td>
                  <td className="text-xs">{p.position ?? "–"}</td>
                  <td className="text-xs text-ivory/60">{p.completionYear ?? "-"}</td>
                  <td>
                    <Pill tone={p.status === "ACTIVE" ? "emerald" : p.status === "INJURED" ? "gold" : p.status === "SUSPENDED" || p.status === "REJECTED" ? "crimson" : "default"}>{p.status}</Pill>
                    {p.statusNote && <div className="mt-1 max-w-[220px] truncate text-[11px] text-ivory/45">{p.statusNote}</div>}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Drawer label="Availability" title={`${p.firstName} ${p.lastName}: availability`} description="Injuries and suspensions show on the public site and block team-sheet selection." buttonClass="btn-quiet btn-sm" side="center">
                        <PlayerStatusForm player={p} allowSuspend />
                      </Drawer>
                      <Drawer label="Edit" title={`Edit ${p.firstName} ${p.lastName}`} buttonClass="btn-ghost btn-sm">
                        <PlayerForm player={p} teams={teams} admin />
                        <div className="mt-8 border-t border-white/[0.06] pt-6">
                          <ActionForm action={deletePlayerAction} confirm="Delete this player and their statistics?">
                            <input type="hidden" name="id" value={p.id} />
                            <Submit className="btn-danger btn-sm">Delete player</Submit>
                          </ActionForm>
                        </div>
                      </Drawer>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
