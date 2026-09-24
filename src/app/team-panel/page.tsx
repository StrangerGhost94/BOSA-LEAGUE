import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCurrentSeason, getMatches, getPlayerStats, getSeasonTable } from "@/lib/data";
import { PageHeader } from "@/components/panel-shell";
import { CountUp } from "@/components/motion";
import { Crest, FormPills, Pill, StatTile } from "@/components/ui";
import { FixtureRow } from "@/components/match";
import { EmptyState } from "@/components/ui";

export default async function TeamHome() {
  const u = await requireRole(["TEAM_MANAGER"]);
  if (!u.team) return <EmptyState title="No club linked" body="Ask the League office to link your account to your club." />;
  const t = u.team;
  const lg = await getCurrentSeason("bosa-league");
  const [table, upcoming, squad] = await Promise.all([lg ? getSeasonTable(lg.id) : [], getMatches({ teamId: t.id, status: "upcoming", limit: 5 }), getPlayerStats({ teamId: t.id, includePending: true })]);
  const row = table.find((r) => r.teamId === t.id);
  const unavailable = squad.filter((p) => p.status === "INJURED" || p.status === "SUSPENDED");
  const pending = squad.filter((p) => p.status === "PENDING");
  return (
    <>
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8" style={{ background: `linear-gradient(120deg, ${t.primaryColor}, #0A0F1E 70%)` }}>
        <div className="flex flex-wrap items-center gap-5">
          <Crest team={t} size={84} />
          <div>
            <div className="eyebrow text-gold-300">Club panel</div>
            <h1 className="headline mt-2 text-4xl sm:text-5xl">{t.name}</h1>
            <div className="mt-1 text-sm text-ivory/60">{t.campus}</div>
          </div>
          {row && (
            <div className="ml-auto flex items-center gap-3 text-xs text-ivory/60">
              Form <FormPills form={row.form} />
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="League position">{row ? <CountUp value={row.position} /> : "-"}</StatTile>
        <StatTile label="Points">{row ? <CountUp value={row.points} /> : "-"}</StatTile>
        <StatTile label="Registered squad" accent="emerald"><CountUp value={squad.length - pending.length} /></StatTile>
        <StatTile label="Unavailable" accent="crimson" hint={`${pending.length} awaiting approval`}><CountUp value={unavailable.length} /></StatTile>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between px-3 pt-2">
            <div className="eyebrow">Next fixtures</div>
            <Link href="/team-panel/matches" className="text-xs text-ivory/50 hover:text-gold">Team sheets</Link>
          </div>
          {upcoming.map((m) => (
            <FixtureRow key={m.id} m={m} />
          ))}
        </div>
        <div className="panel p-5">
          <div className="eyebrow mb-4">Availability</div>
          {unavailable.length === 0 && pending.length === 0 && <p className="text-sm text-ivory/45">Full squad available.</p>}
          <ul className="space-y-2.5">
            {[...unavailable, ...pending].map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 font-display text-gold">{p.number || "–"}</span>
                <span className="flex-1">
                  {p.firstName} {p.lastName}
                  {p.statusNote && <span className="block text-xs text-ivory/45">{p.statusNote}</span>}
                </span>
                <Pill tone={p.status === "SUSPENDED" ? "crimson" : "gold"}>{p.status === "PENDING" ? "Pending" : p.status.toLowerCase()}</Pill>
              </li>
            ))}
          </ul>
          <Link href="/team-panel/squad" className="btn-ghost btn-sm mt-5">Manage squad</Link>
        </div>
      </div>
    </>
  );
}
