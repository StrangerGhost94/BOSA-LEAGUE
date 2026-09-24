import Link from "next/link";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { FilterBar } from "@/components/filter-bar";
import { MatchFields } from "@/components/admin/match-fields";
import { Crest, EmptyState, StatusBadge } from "@/components/ui";
import { createMatchAction, generateRoundRobinAction, releaseRoundAction } from "@/app/actions/admin";
import { getTeams, getVenues } from "@/lib/data";
import { getAllSeasons, getReferees } from "@/lib/admin-data";
import { fmtDate, fmtTime, toLocalInput } from "@/lib/format";

export const metadata = { title: "Fixtures & results" };

export default async function AdminFixtures({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const [teams, venues, referees, seasons] = await Promise.all([getTeams(), getVenues(), getReferees(), getAllSeasons()]);
  const current = seasons.filter((x) => x.isCurrent);
  const seasonId = searchParams.season ?? current.find((x) => x.competition.type === "LEAGUE")?.id ?? seasons[0]?.id;
  const conds = [eq(s.matches.seasonId, seasonId!)];
  if (searchParams.md) conds.push(eq(s.matches.matchday, parseInt(searchParams.md, 10)));
  if (searchParams.team) conds.push(or(eq(s.matches.homeTeamId, searchParams.team), eq(s.matches.awayTeamId, searchParams.team))!);
  if (searchParams.status) conds.push(inArray(s.matches.status, searchParams.status.split(",") as s.MatchStatus[]));
  const matches = await db.query.matches.findMany({
    where: and(...conds),
    with: { homeTeam: true, awayTeam: true, venue: true, referee: { columns: { name: true } } },
    orderBy: [asc(s.matches.kickoff)],
  });
  const seasonOpts = seasons.map((x) => ({ id: x.id, label: `${x.competition.name} · ${x.name}${x.isCurrent ? " (current)" : ""}`, groups: x.groups.map((g) => ({ id: g.id, name: g.name })) }));
  const byRound = new Map<string, typeof matches>();
  for (const m of matches) {
    const k = m.round;
    if (!byRound.has(k)) byRound.set(k, []);
    byRound.get(k)!.push(m);
  }
  const mds = Array.from(new Set(matches.map((m) => m.matchday).filter(Boolean))) as number[];

  return (
    <>
      <PageHeader eyebrow="Schedule · Reschedule · Record" title="Fixtures & results">
        <Drawer label="Generate season fixtures" title="Generate fixtures" description="Creates a round-robin schedule for every team entered in the season." buttonClass="btn-ghost btn-sm" icon="calendar">
          <ActionForm action={generateRoundRobinAction} className="space-y-5">
            <Field label="Season">
              <select name="seasonId" className="input">
                {seasonOpts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First matchday">
                <input name="startDate" type="date" className="input" required />
              </Field>
              <Field label="Days between matchdays">
                <input name="interval" type="number" defaultValue={7} className="input" />
              </Field>
            </div>
            <Field label="Kick-off times (comma separated)">
              <input name="times" className="input" defaultValue="10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00" />
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
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="double" defaultChecked className="accent-[#CC2654]" /> Home and away (double round-robin)
            </label>
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="replace" className="accent-[#CC2654]" /> Replace existing unplayed fixtures
            </label>
            <Submit pendingText="Generating">Generate fixtures</Submit>
          </ActionForm>
        </Drawer>
        <Drawer label="Schedule fixture" title="Schedule a fixture" description="Assign teams, kick-off, venue and referee." icon="plus" defaultOpen={searchParams.new === "1"}>
          <ActionForm action={createMatchAction} className="space-y-6" resetOnSuccess>
            <MatchFields mode="create" teams={teams} venues={venues} referees={referees} seasons={seasonOpts} />
            <Submit pendingText="Scheduling">Schedule fixture</Submit>
          </ActionForm>
        </Drawer>
      </PageHeader>

      <FilterBar
        className="mb-8"
        filters={[
          { name: "season", label: "Season", type: "select", all: "Current League season", options: seasonOpts.map((x) => ({ value: x.id, label: x.label })) },
          { name: "md", label: "Matchday", type: "select", all: "All matchdays", options: mds.sort((a, b) => a - b).map((n) => ({ value: String(n), label: `Matchday ${n}` })) },
          { name: "team", label: "Team", type: "select", all: "All teams", options: teams.map((t) => ({ value: t.id, label: t.name })) },
          { name: "status", label: "Status", type: "select", all: "Any status", options: [{ value: "SCHEDULED", label: "Scheduled" }, { value: "LIVE,HALF_TIME", label: "Live" }, { value: "FULL_TIME", label: "Full-time" }, { value: "POSTPONED", label: "Postponed" }, { value: "CANCELLED", label: "Cancelled" }] },
        ]}
      />

      {matches.length === 0 && <EmptyState title="No fixtures yet" body="Schedule a single fixture or generate the whole season in one step." />}
      <div className="space-y-8">
        {Array.from(byRound.entries()).map(([round, ms]) => (
          <div key={round} className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <h2 className="font-serif text-xl">{round}</h2>
              <span className="flex items-center gap-3 text-xs text-ivory/45">
                {(() => {
                  const until = ms.find((m) => m.publicFrom && m.publicFrom.getTime() > Date.now())?.publicFrom;
                  return until ? <span className="rounded-full bg-gold/15 px-2.5 py-1 font-semibold text-gold">Members first until {fmtDate(until, { day: "numeric", month: "short" })} {fmtTime(until)}</span> : null;
                })()}
                {fmtDate(ms[0].kickoff, { weekday: "long", day: "numeric", month: "long" })}
                <Drawer label="Early access" title={`Early access: ${round}`} description="Members see these fixtures straight away. Everyone else sees them from the time you choose. Leave empty to make them public now." buttonClass="btn-quiet btn-sm" side="center">
                  <ActionForm action={releaseRoundAction} className="space-y-4">
                    <input type="hidden" name="seasonId" value={seasonId} />
                    <input type="hidden" name="round" value={round} />
                    <Field label="Public from (Kampala time)">
                      <input
                        name="publicFrom"
                        type="datetime-local"
                        className="input"
                        defaultValue={(() => {
                          const p = ms.find((m) => m.publicFrom)?.publicFrom;
                          return p ? toLocalInput(p) : "";
                        })()}
                      />
                    </Field>
                    <Submit>Save</Submit>
                  </ActionForm>
                </Drawer>
              </span>
            </div>
            <div className="overflow-x-auto scrollbar-none">
              <table className="table-luxe min-w-[860px]">
                <thead>
                  <tr>
                    <th>Kick-off</th>
                    <th className="text-right">Home</th>
                    <th className="text-center">Score</th>
                    <th>Away</th>
                    <th>Venue</th>
                    <th>Referee</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ms.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap text-xs">
                        <span className="block text-gold">{fmtDate(m.kickoff, { day: "numeric", month: "short" })}</span>
                        {fmtTime(m.kickoff)}
                      </td>
                      <td>
                        <span className="flex items-center justify-end gap-2">
                          {m.homeTeam?.name ?? "TBD"} <Crest team={m.homeTeam} size={24} />
                        </span>
                      </td>
                      <td className="text-center font-display text-lg">{m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : "-"}</td>
                      <td>
                        <span className="flex items-center gap-2">
                          <Crest team={m.awayTeam} size={24} /> {m.awayTeam?.name ?? "TBD"}
                        </span>
                      </td>
                      <td className="text-xs text-ivory/60">{m.venue?.name ?? "TBC"}</td>
                      <td className="text-xs text-ivory/60">{m.referee?.name ?? <span className="text-crimson-400">Unassigned</span>}</td>
                      <td>
                        <StatusBadge status={m.status} minute={m.minute} />
                      </td>
                      <td className="text-right">
                        <Link href={`/admin/matches/${m.id}`} className="btn-ghost btn-sm">
                          Console
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
