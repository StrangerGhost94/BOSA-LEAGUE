import Link from "next/link";
import clsx from "clsx";
import { CompetitionHero } from "@/components/competition";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState, Pill } from "@/components/ui";
import { getPlayerStats, getTeams, expireStatuses } from "@/lib/data";
import { POSITION_LABEL } from "@/lib/format";

export const metadata = { title: "Players" };

const SORTS: Record<string, (a: import("@/lib/data").PlayerStat, b: import("@/lib/data").PlayerStat) => number> = {
  goals: (a, b) => b.goals - a.goals || b.assists - a.assists,
  assists: (a, b) => b.assists - a.assists || b.goals - a.goals,
  apps: (a, b) => b.apps - a.apps,
  cards: (a, b) => b.yellows + b.reds * 2 - (a.yellows + a.reds * 2),
  cleansheets: (a, b) => b.cleanSheets - a.cleanSheets,
  potm: (a, b) => b.potm - a.potm,
  name: (a, b) => a.lastName.localeCompare(b.lastName),
};

export default async function PlayersPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await expireStatuses();
  const [all, teams] = await Promise.all([getPlayerStats(), getTeams()]);
  const q = (searchParams.q ?? "").toLowerCase();
  const team = teams.find((t) => t.slug === searchParams.team);
  let list = all.filter(
    (p) =>
      (!q || `${p.firstName} ${p.lastName} ${p.teamName}`.toLowerCase().includes(q)) &&
      (!team || p.teamId === team.id) &&
      (!searchParams.pos || p.position === searchParams.pos) &&
      (!searchParams.status || p.status === searchParams.status) &&
      (!searchParams.year || String(p.completionYear) === searchParams.year),
  );
  list = list.sort(SORTS[searchParams.sort ?? "goals"] ?? SORTS.goals);
  const shown = list.slice(0, 120);

  return (
    <>
      <CompetitionHero
        type="LEAGUE"
        name="Player Directory"
        season="All competitions · Season 4"
        tagline="Every registered Bilal Institute old student, with live statistics."
        stats={[
          { label: "Registered players", value: all.length },
          { label: "Goals scored", value: all.reduce((a, p) => a + p.goals, 0) },
          { label: "Clubs", value: teams.length },
          { label: "Top scorer goals", value: Math.max(0, ...all.map((p) => p.goals)) },
        ]}
      />
      <section className="container-x">
        <FilterBar
          filters={[
            { name: "q", label: "Search", type: "search", placeholder: "Player or club name" },
            { name: "team", label: "Club", type: "select", all: "All clubs", options: teams.map((t) => ({ value: t.slug, label: t.name })) },
            { name: "pos", label: "Position", type: "select", all: "All positions", options: Object.entries(POSITION_LABEL).map(([value, label]) => ({ value, label })) },
            { name: "status", label: "Status", type: "select", all: "Any status", options: [{ value: "ACTIVE", label: "Available" }, { value: "INJURED", label: "Injured" }, { value: "SUSPENDED", label: "Suspended" }] },
            { name: "year", label: "Completion year", type: "select", all: "All years", options: Array.from(new Set(all.map((p) => p.completionYear).filter((y): y is number => !!y))).sort((a, b) => b - a).map((y) => ({ value: String(y), label: `Class of ${y}` })) },
            { name: "sort", label: "Sort by", type: "select", all: "Goals", options: [{ value: "assists", label: "Assists" }, { value: "apps", label: "Appearances" }, { value: "cleansheets", label: "Clean sheets" }, { value: "potm", label: "Player of the match" }, { value: "cards", label: "Cards" }, { value: "name", label: "Name" }] },
          ]}
        />
        <div className="mt-3 text-right text-xs text-ivory/40">
          Showing {shown.length} of {list.length} players
        </div>
        {list.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No players match" body="Try a different name or clear some filters." />
          </div>
        ) : (
          <div className="panel mt-4 overflow-x-auto p-2 scrollbar-none sm:p-4">
            <table className="table-luxe min-w-[820px]">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Club</th>
                  <th className="text-center">Pos</th>
                  <th className="text-center">Apps</th>
                  <th className="text-center">Goals</th>
                  <th className="text-center">Assists</th>
                  <th className="text-center">CS</th>
                  <th className="text-center">Cards</th>
                  <th className="text-center">POTM</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p, i) => (
                  <tr key={p.id} className="row-in group hover:bg-white/[0.035]" style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}>
                    <td>
                      <Link href={`/players/${p.id}`} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full font-display text-sm" style={{ background: `${p.primaryColor}33`, color: p.primaryColor === "#0D0D0D" ? "#F2F2F2" : p.primaryColor }}>
                          {p.number || "–"}
                        </span>
                        <span>
                          <span className="block font-semibold group-hover:text-gold">
                            {p.firstName} {p.lastName}
                          </span>
                          {p.completionYear && <span className="text-[10px] uppercase tracking-[0.14em] text-ivory/40">Class of {p.completionYear}</span>}

                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/teams/${p.teamSlug}`} className="flex items-center gap-2 text-ivory/70 hover:text-ivory">
                        <img src={p.crest} alt="" className="h-6 w-6 rounded-full bg-white" /> {p.teamName}
                      </Link>
                    </td>
                    <td className="text-center text-xs text-ivory/60">{p.position}</td>
                    <td className="text-center tabular-nums">{p.apps}</td>
                    <td className={clsx("text-center font-display text-base tabular-nums", p.goals > 0 && "text-gold")}>{p.goals}</td>
                    <td className="text-center tabular-nums">{p.assists}</td>
                    <td className="text-center tabular-nums">{p.position === "GK" ? p.cleanSheets : "-"}</td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="inline-block h-3 w-2 rounded-[2px] bg-yellow-400" />
                        {p.yellows}
                        <span className="ml-1 inline-block h-3 w-2 rounded-[2px] bg-crimson" />
                        {p.reds}
                      </span>
                    </td>
                    <td className="text-center tabular-nums">{p.potm}</td>
                    <td>{p.status === "ACTIVE" ? <Pill tone="emerald">Available</Pill> : p.status === "INJURED" ? <Pill tone="gold">Injured</Pill> : <Pill tone="crimson">Suspended</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
