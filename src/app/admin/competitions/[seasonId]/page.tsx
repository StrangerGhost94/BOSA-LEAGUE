import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { Crest, Icon } from "@/components/ui";
import { StandingsTable } from "@/components/match";
import {
  updateSeasonAction,
  setSeasonTeamsAction,
  saveGroupAction,
  deleteGroupAction,
  generateGroupFixturesAction,
  generateKnockoutAction,
} from "@/app/actions/admin";
import { getGroupTables, getSeasonTable, getTeams, getVenues } from "@/lib/data";

export default async function SeasonAdmin({ params }: { params: { seasonId: string } }) {
  const season = await db.query.seasons.findFirst({
    where: eq(s.seasons.id, params.seasonId),
    with: { competition: true, teams: true, groups: { orderBy: asc(s.groups.order), with: { teams: true } } },
  });
  if (!season) notFound();
  const [teams, venues] = await Promise.all([getTeams(), getVenues()]);
  const entered = new Set(season.teams.map((t) => t.teamId));
  const adj = Object.fromEntries(season.teams.map((t) => [t.teamId, t.pointsAdjustment]));
  const base = Object.fromEntries(season.teams.map((t) => [t.teamId, t]));
  const isCup = season.competition.type === "CHAMPIONS";
  const table = isCup ? [] : await getSeasonTable(season.id);
  const groupTables = isCup ? await getGroupTables(season.id) : [];
  const ko = isCup ? await db.query.matches.findFirst({ where: (m, { and, eq }) => and(eq(m.seasonId, season.id), eq(m.stage, "QUARTER_FINAL")) }) : null;

  return (
    <>
      <Link href="/admin/competitions" className="mb-4 inline-flex items-center gap-1 text-sm text-ivory/50 hover:text-gold">
        <Icon name="arrowLeft" size={14} /> All competitions
      </Link>
      <PageHeader eyebrow={season.competition.name} title={season.name}>
        <Link href={`/admin/fixtures?season=${season.id}`} className="btn-ghost btn-sm">
          <Icon name="calendar" size={14} /> Fixtures
        </Link>
        <Drawer label="Season settings" title="Season settings" icon="settings">
          <ActionForm action={updateSeasonAction} className="space-y-5">
            <input type="hidden" name="id" value={season.id} />
            <Field label="Season name">
              <input name="name" className="input" defaultValue={season.name} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Points for a win">
                <input name="pointsWin" type="number" className="input" defaultValue={season.pointsWin} />
              </Field>
              <Field label="Points for a draw">
                <input name="pointsDraw" type="number" className="input" defaultValue={season.pointsDraw} />
              </Field>
            </div>
            <Field label="Champion (set when the season ends)">
              <select name="championId" className="input" defaultValue={season.championId ?? ""}>
                <option value="">Not decided</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="isCurrent" defaultChecked={season.isCurrent} className="accent-[#CC2654]" /> Current season
            </label>
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="registrationOpen" defaultChecked={season.registrationOpen} className="accent-[#CC2654]" /> Team registration open
            </label>
            <Field label="Registration information">
              <textarea name="registrationNote" rows={3} className="input" defaultValue={season.registrationNote ?? ""} />
            </Field>
            <Submit>Save season</Submit>
          </ActionForm>
        </Drawer>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <div className="panel p-6">
          <div className="eyebrow mb-4">Entered clubs and points adjustments</div>
          <ActionForm action={setSeasonTeamsAction}>
            <input type="hidden" name="seasonId" value={season.id} />
            <ul className="space-y-1.5">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                  <input type="checkbox" name="teamId" value={t.id} defaultChecked={entered.has(t.id)} className="accent-[#D6B676]" aria-label={`Enter ${t.name}`} />
                  <Crest team={t} size={24} />
                  <span className="flex-1 text-sm">{t.name}</span>
                  {entered.has(t.id) && !isCup && (
                    <label className="flex items-center gap-2 text-xs text-ivory/45">
                      Pts adj.
                      <input name={`adj_${t.id}`} type="number" defaultValue={adj[t.id] ?? 0} className="input w-16 px-2 py-1 text-center" />
                    </label>
                  )}
                </li>
              ))}
            </ul>
            {!isCup && season.teams.length > 0 && (
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <div className="eyebrow mb-1">Opening balance</div>
                <p className="mb-3 text-xs text-ivory/50">Results from before match-by-match recording (for example, copied from an official table). Recorded results are added on top automatically.</p>
                <div className="overflow-x-auto scrollbar-none">
                  <table className="table-luxe min-w-[560px] text-xs">
                    <thead>
                      <tr>
                        <th>Club</th>
                        {["P", "W", "D", "L", "GF", "GA"].map((h) => (
                          <th key={h} className="text-center">{h}</th>
                        ))}
                        <th>Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams
                        .filter((t) => entered.has(t.id))
                        .map((t) => (
                          <tr key={t.id}>
                            <td className="whitespace-nowrap">{t.name}</td>
                            {(
                              [
                                ["bp", base[t.id]?.basePlayed],
                                ["bw", base[t.id]?.baseWon],
                                ["bd", base[t.id]?.baseDrawn],
                                ["bl", base[t.id]?.baseLost],
                                ["bf", base[t.id]?.baseGoalsFor],
                                ["ba", base[t.id]?.baseGoalsAgainst],
                              ] as const
                            ).map(([k, v]) => (
                              <td key={k} className="px-1">
                                <input name={`${k}_${t.id}`} type="number" min={0} defaultValue={v ?? 0} className="input w-14 px-1 py-1 text-center" aria-label={`${t.name} ${k}`} />
                              </td>
                            ))}
                            <td className="px-1">
                              <input name={`form_${t.id}`} defaultValue={base[t.id]?.baseForm ?? ""} className="input w-24 px-2 py-1 uppercase" placeholder="WDLW" aria-label={`${t.name} form`} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <Submit className="btn-gold btn-sm mt-5">Save</Submit>
          </ActionForm>
        </div>

        {!isCup ? (
          <div className="panel p-4">
            <div className="eyebrow mb-2 px-2 pt-2">Live standings</div>
            <StandingsTable rows={table} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="panel p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="eyebrow">Groups</div>
                <div className="flex gap-2">
                  <Drawer label="Add group" title="Create a group" buttonClass="btn-ghost btn-sm" icon="plus">
                    <GroupForm seasonId={season.id} teams={teams} selected={[]} />
                  </Drawer>
                  <Drawer label="Generate group fixtures" title="Generate group fixtures" buttonClass="btn-ghost btn-sm" icon="calendar" side="center">
                    <ActionForm action={generateGroupFixturesAction} className="space-y-4">
                      <input type="hidden" name="seasonId" value={season.id} />
                      <Field label="First round date">
                        <input name="startDate" type="date" className="input" required />
                      </Field>
                      <Field label="Kick-off time">
                        <input name="time" type="time" className="input" defaultValue="17:00" />
                      </Field>
                      <Field label="Venue">
                        <select name="venueId" className="input">
                          {venues.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Submit>Generate</Submit>
                    </ActionForm>
                  </Drawer>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {groupTables.map((g) => {
                  const grp = season.groups.find((x) => x.id === g.id)!;
                  return (
                    <div key={g.id} className="rounded-xl border border-white/[0.07] p-3">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="font-serif text-lg">{g.name}</span>
                        <span className="flex gap-1">
                          <Drawer label="Edit" title={`Edit ${g.name}`} buttonClass="btn-quiet btn-sm">
                            <GroupForm seasonId={season.id} teams={teams} selected={grp.teams.map((t) => t.teamId)} groupId={g.id} name={g.name} />
                            <div className="mt-6 border-t border-white/[0.06] pt-5">
                              <ActionForm action={deleteGroupAction} confirm="Delete this group? Its fixtures will stay but lose their group link.">
                                <input type="hidden" name="groupId" value={g.id} />
                                <Submit className="btn-danger btn-sm">Delete group</Submit>
                              </ActionForm>
                            </div>
                          </Drawer>
                        </span>
                      </div>
                      {g.rows.map((r) => (
                        <div key={r.teamId} className="flex items-center gap-2 px-1 py-1 text-sm">
                          <span className="w-4 text-ivory/40">{r.position}</span>
                          <Crest team={r.team} size={20} />
                          <span className="flex-1 truncate">{r.team.name}</span>
                          <span className="text-xs text-ivory/45">{r.played}P</span>
                          <span className="w-6 text-right font-display">{r.points}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel p-6">
              <div className="eyebrow mb-2">Knockout rounds</div>
              {ko ? (
                <p className="text-sm text-ivory/60">
                  The knockout bracket is drawn. Winners advance automatically when results are confirmed.{" "}
                  <Link href={`/admin/fixtures?season=${season.id}`} className="text-gold hover:underline">
                    Manage knockout fixtures
                  </Link>
                </p>
              ) : (
                <ActionForm action={generateKnockoutAction} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="seasonId" value={season.id} />
                  <Field label="Quarter-final date">
                    <input name="startDate" type="date" className="input" required />
                  </Field>
                  <Field label="Venue">
                    <select name="venueId" className="input">
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Submit className="btn-gold">Draw bracket from group tables</Submit>
                </ActionForm>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function GroupForm({ seasonId, teams, selected, groupId, name }: { seasonId: string; teams: { id: string; name: string; crest: string; primaryColor: string }[]; selected: string[]; groupId?: string; name?: string }) {
  return (
    <ActionForm action={saveGroupAction} className="space-y-4">
      <input type="hidden" name="seasonId" value={seasonId} />
      {groupId && <input type="hidden" name="groupId" value={groupId} />}
      <Field label="Group name">
        <input name="name" className="input" defaultValue={name ?? ""} placeholder="Group E" />
      </Field>
      <div className="grid grid-cols-2 gap-1.5">
        {teams.map((t) => (
          <label key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
            <input type="checkbox" name="teamId" value={t.id} defaultChecked={selected.includes(t.id)} className="accent-[#D6B676]" />
            <Crest team={t} size={20} /> {t.name}
          </label>
        ))}
      </div>
      <Submit>Save group</Submit>
    </ActionForm>
  );
}
