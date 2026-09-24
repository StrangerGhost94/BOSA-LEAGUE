import { CompetitionHero } from "@/components/competition";
import { FilterBar } from "@/components/filter-bar";
import { MatchCard } from "@/components/match";
import { Stagger, StaggerItem } from "@/components/motion";
import { EmptyState } from "@/components/ui";
import { getCompetitions, getMatches, getTeams, getVenues, visibleTo } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { dayKey, fmtLong } from "@/lib/format";

export const metadata = { title: "Fixtures and Results" };

export default async function FixturesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const [comps, teams, venues, currentSeasons] = await Promise.all([getCompetitions(), getTeams(), getVenues(), db.select().from(seasons).where(eq(seasons.isCurrent, true))]);
  const comp = comps.find((c) => c.slug === searchParams.comp);
  const seasonIds = comp ? currentSeasons.filter((s) => s.competitionId === comp.id).map((s) => s.id) : currentSeasons.map((s) => s.id);
  const team = teams.find((t) => t.slug === searchParams.team);
  const status = (["upcoming", "completed", "live"].includes(searchParams.status ?? "") ? searchParams.status : "all") as "upcoming" | "completed" | "live" | "all";
  const from = searchParams.from ? new Date(`${searchParams.from}T00:00:00+03:00`) : undefined;
  const to = searchParams.to ? new Date(`${searchParams.to}T23:59:59+03:00`) : undefined;
  const member = hasMembership(await getCurrentUser());
  const matchesAll = await getMatches({
    seasonIds,
    teamId: team?.id,
    venueId: searchParams.venue || undefined,
    status,
    from,
    to,
    order: status === "completed" ? "desc" : "asc",
    limit: 400,
  });
  const matches = visibleTo(matchesAll, member);
  const earlyCount = matchesAll.length - matches.length;
  // Default view: from last week onwards, so the page opens on what matters now
  const defaultView = !searchParams.from && !searchParams.to && status === "all";
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 8;
  const list = defaultView ? matches.filter((m) => m.kickoff.getTime() >= cutoff).slice(0, 60) : matches;
  const byDay = new Map<string, typeof list>();
  for (const m of list) {
    const k = dayKey(m.kickoff);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(m);
  }

  return (
    <>
      <CompetitionHero
        type="LEAGUE"
        name="Fixtures & Results"
        season="Every competition · Every matchday"
        tagline="Filter by competition, club, venue, date and status."
        stats={[
          { label: "Matches listed", value: matches.length },
          { label: "Completed", value: matches.filter((m) => m.status === "FULL_TIME").length },
          { label: "Upcoming", value: matches.filter((m) => m.status === "SCHEDULED").length },
          { label: "Venues", value: venues.length },
        ]}
      />
      <section className="container-x">
        <FilterBar
          filters={[
            { name: "comp", label: "Competition", type: "select", all: "All competitions", options: comps.map((c) => ({ value: c.slug, label: c.name })) },
            { name: "team", label: "Club", type: "select", all: "All clubs", options: teams.map((t) => ({ value: t.slug, label: t.name })) },
            { name: "venue", label: "Venue", type: "select", all: "All venues", options: venues.map((v) => ({ value: v.id, label: v.name })) },
            { name: "status", label: "Status", type: "select", all: "Upcoming and recent", options: [{ value: "upcoming", label: "Upcoming" }, { value: "live", label: "Live" }, { value: "completed", label: "Results" }] },
            { name: "from", label: "From", type: "date" },
            { name: "to", label: "To", type: "date" },
          ]}
        />
        {earlyCount > 0 && (
          <a href="/members" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-gold/[0.06] px-5 py-4 text-sm">
            <span>
              <span className="font-semibold text-gold">{earlyCount} upcoming fixture{earlyCount === 1 ? " is" : "s are"} in members&apos; early access.</span>{" "}
              <span className="text-ivory/60">Members see them before everyone else.</span>
            </span>
            <span className="shrink-0 text-gold">Become a member</span>
          </a>
        )}
        <div className="mt-12 space-y-14">
          {byDay.size === 0 && <EmptyState title="No matches found" body="Try widening the date range or clearing a filter." />}
          {Array.from(byDay.entries()).map(([day, ms]) => (
            <div key={day}>
              <div className="sticky top-[68px] z-20 -mx-2 mb-5 flex items-center gap-4 bg-night-900/85 px-2 py-3 backdrop-blur-lg lg:top-[76px]">
                <h2 className="font-serif text-2xl sm:text-3xl">{fmtLong(ms[0].kickoff)}</h2>
                <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
                <span className="text-xs uppercase tracking-[0.18em] text-ivory/45">{ms.length} match{ms.length > 1 ? "es" : ""}</span>
              </div>
              <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ms.map((m) => (
                  <StaggerItem key={m.id}>
                    <MatchCard m={m} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
