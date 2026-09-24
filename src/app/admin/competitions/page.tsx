import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { CompetitionBadge, Pill } from "@/components/ui";
import { createCompetitionAction, createSeasonAction } from "@/app/actions/admin";
import { pool } from "@/db";

export const metadata = { title: "Competitions & seasons" };

export default async function AdminCompetitions() {
  const comps = await db.query.competitions.findMany({
    orderBy: asc(s.competitions.order),
    with: { seasons: { orderBy: desc(s.seasons.year), with: { champion: true } } },
  });
  const { rows } = await pool.query("select season_id, count(*)::int total, count(*) filter (where status='FULL_TIME')::int played from matches group by season_id");
  const prog = Object.fromEntries(rows.map((r: { season_id: string; total: number; played: number }) => [r.season_id, r]));
  return (
    <>
      <PageHeader eyebrow="Structure of the institution" title="Competitions & seasons">
        <Drawer label="New competition" title="Create a competition" buttonClass="btn-ghost btn-sm" icon="plus">
          <ActionForm action={createCompetitionAction} className="space-y-5">
            <Field label="Name">
              <input name="name" className="input" required placeholder="e.g. BOSA Cup" />
            </Field>
            <Field label="Short name">
              <input name="shortName" className="input" />
            </Field>
            <Field label="Format">
              <select name="type" className="input">
                <option value="LEAGUE">League table</option>
                <option value="CHAMPIONS">Groups and knockout</option>
                <option value="SUPER">Single season-opening match (Super League format)</option>
              </select>
            </Field>
            <Field label="Tagline">
              <input name="tagline" className="input" />
            </Field>
            <Field label="Description">
              <textarea name="description" rows={3} className="input" />
            </Field>
            <Submit>Create competition</Submit>
          </ActionForm>
        </Drawer>
        <Drawer label="New season" title="Create a season" icon="plus">
          <ActionForm action={createSeasonAction} className="space-y-5">
            <Field label="Competition">
              <select name="competitionId" className="input">
                {comps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Season name">
                <input name="name" className="input" required placeholder="Season 5" />
              </Field>
              <Field label="Year">
                <input name="year" type="number" className="input" defaultValue={new Date().getFullYear() + 1} />
              </Field>
              <Field label="Points for a win">
                <input name="pointsWin" type="number" className="input" defaultValue={3} />
              </Field>
              <Field label="Points for a draw">
                <input name="pointsDraw" type="number" className="input" defaultValue={1} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="allTeams" defaultChecked className="accent-[#CC2654]" /> Enter all registered clubs
            </label>
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="isCurrent" className="accent-[#CC2654]" /> Make this the current season
            </label>
            <Submit>Create season</Submit>
          </ActionForm>
        </Drawer>
      </PageHeader>

      <div className="space-y-6">
        {comps.map((c) => (
          <div key={c.id} className="panel p-6">
            <div className="flex flex-wrap items-center gap-4">
              <CompetitionBadge type={c.type} size={48} />
              <div className="flex-1">
                <h2 className="font-serif text-2xl">{c.name}</h2>
                <div className="text-sm text-ivory/50">{c.tagline}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {c.seasons.map((season) => {
                const p = prog[season.id] ?? { total: 0, played: 0 };
                return (
                  <Link key={season.id} href={`/admin/competitions/${season.id}`} className="group rounded-xl border border-white/[0.07] bg-night-900/50 p-4 transition hover:border-gold/30">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold group-hover:text-gold">{season.name}</span>
                      {season.isCurrent ? <Pill tone="emerald">Current</Pill> : <Pill>{season.year}</Pill>}
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="bar-grow h-full rounded-full bg-gradient-to-r from-crimson to-gold" style={{ width: `${p.total ? (p.played / p.total) * 100 : 0}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-ivory/45">
                      {p.played} of {p.total} matches played{season.champion ? ` · Champion: ${season.champion.name}` : ""}
                    </div>
                  </Link>
                );
              })}
              {c.seasons.length === 0 && <p className="text-sm text-ivory/45">No seasons yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
