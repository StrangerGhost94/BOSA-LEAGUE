import Link from "next/link";
import { CompetitionHero } from "@/components/competition";
import { Stagger, StaggerItem } from "@/components/motion";
import { Crest } from "@/components/ui";
import { db, pool } from "@/db";
import { getCurrentSeason, getSeasonTable, getTeams } from "@/lib/data";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  const teams = (await getTeams()).filter((t) => t.active).sort((a, b) => (a.intakeYear ?? 9999) - (b.intakeYear ?? 9999));
  const lg = await getCurrentSeason("bosa-league");
  const table = lg ? await getSeasonTable(lg.id) : [];
  const pos = Object.fromEntries(table.map((r) => [r.teamId, r]));
  const { rows: squad } = await pool.query("select team_id, count(*)::int c from players where status not in ('PENDING','REJECTED') group by team_id");
  const squadSize = Object.fromEntries(squad.map((r: { team_id: string; c: number }) => [r.team_id, r.c]));
  const entries = await db.query.seasonTeams.findMany({ with: { season: { with: { competition: true } } } });
  const comps: Record<string, string[]> = {};
  for (const e of entries) if (e.season.isCurrent) (comps[e.teamId] ??= []).push(e.season.competition.shortName);

  return (
    <>
      <CompetitionHero
        type="LEAGUE"
        name="The Fourteen"
        season="Registered clubs · Season 4"
        tagline="Fourteen clubs of Bilal Institute old students."
        stats={[
          { label: "Registered clubs", value: teams.length },
          { label: "Registered players", value: Object.values(squadSize).reduce((a, b) => a + b, 0) },
          { label: "Competitions", value: 3 },
          { label: "Matchdays played", value: table[0]?.played ?? 0 },
        ]}
      />
      <section className="container-x">
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t) => (
            <StaggerItem key={t.id}>
              <Link
                href={`/teams/${t.slug}`}
                className="group relative block h-full overflow-hidden rounded-3xl border border-white/[0.07] bg-night-800/70 p-6 transition-all duration-700 hover:-translate-y-2 hover:border-transparent"
                style={{ ["--c1" as string]: t.primaryColor, ["--c2" as string]: t.secondaryColor }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,var(--c1),transparent_70%)] opacity-0 transition-opacity duration-700 group-hover:opacity-70" />
                <div className="absolute inset-0 opacity-0 shadow-[inset_0_0_0_1px_var(--c1)] transition-opacity duration-700 group-hover:opacity-100 rounded-3xl" />
                <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-[var(--c1)] opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-50" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <Crest team={t} size={88} className="transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-3" />
                    {pos[t.id] && (
                      <div className="text-right">
                        <div className="font-display text-3xl text-ivory/30 transition group-hover:text-ivory">{pos[t.id].position}</div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-ivory/40">League pos</div>
                      </div>
                    )}
                  </div>
                  <h2 className="mt-6 font-serif text-3xl">{t.name}</h2>
                  <div className="mt-1 text-sm text-ivory/55">{t.intakeYear ? `${t.intakeYear} intake` : t.campus}</div>
                  <div className="mt-5 flex h-1.5 overflow-hidden rounded-full">
                    <span className="flex-[3]" style={{ background: t.primaryColor }} />
                    <span className="flex-[2]" style={{ background: t.secondaryColor }} />
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.18em] text-ivory/40">Played</dt>
                      <dd className="font-display text-lg">{pos[t.id]?.played ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.18em] text-ivory/40">Squad</dt>
                      <dd className="font-display text-lg">{squadSize[t.id] ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-[0.18em] text-ivory/40">Points</dt>
                      <dd className="font-display text-lg">{pos[t.id]?.points ?? 0}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {(comps[t.id] ?? []).map((c) => (
                      <span key={c} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ivory/60">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
