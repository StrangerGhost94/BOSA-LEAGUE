import { PageHeader } from "@/components/panel-shell";
import { Icon } from "@/components/ui";
import { DownloadCard } from "@/components/download-button";
import { PosterStudio, type MatchdayOption } from "@/components/posters/studio";
import type { MatchLine, PosterSpec } from "@/components/posters/poster";
import { getCompetition, getMatches, getPlayerStats, getSeasonTable, getSeasonsForAdmin } from "@/lib/data";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";

export const metadata = { title: "Reports & exports" };
export const dynamic = "force-dynamic";

const TZ = "Africa/Kampala";
/** "27 . Sept . 2026", as on the official graphics */
const posterDate = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day} . ${p.month} . ${p.year}`;
};

async function posterData() {
  const lg = await getCompetition("bosa-league");
  const season = lg?.season;
  if (!season) return null;
  const [table, matches, stats] = await Promise.all([getSeasonTable(season.id), getMatches({ seasonId: season.id }), getPlayerStats({ seasonId: season.id })]);
  const team = (t: { name: string; crest: string } | null | undefined) => (t ? { name: t.name, crest: t.crest } : null);

  const tableSpec: PosterSpec = {
    kind: "table",
    season: season.name,
    rows: table.map((r) => ({ position: r.position, team: { name: r.team.name, crest: r.team.crest }, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, goalDifference: r.goalDifference, points: r.points })),
  };
  const scorersSpec: PosterSpec = {
    kind: "scorers",
    season: season.name,
    rows: stats
      .filter((p) => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .map((p) => ({ name: `${p.firstName} ${p.lastName}`.trim(), team: { name: p.teamName, crest: p.crest }, goals: p.goals })),
  };

  const byMd = new Map<number, typeof matches>();
  for (const m of matches) if (m.matchday && m.status !== "CANCELLED") byMd.set(m.matchday, [...(byMd.get(m.matchday) ?? []), m]);
  const matchdays: MatchdayOption[] = [...byMd.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([md, list]) => {
      list.sort((a, b) => +a.kickoff - +b.kickoff);
      const lines: MatchLine[] = list.map((m) => ({
        id: m.id,
        home: team(m.homeTeam),
        away: team(m.awayTeam),
        kickoff: m.kickoff.toISOString(),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePens: m.homePens,
        awayPens: m.awayPens,
        status: m.status,
      }));
      const v = list[0].venue;
      const venue = v ? `${v.name}${v.area ? ` - ${v.area}` : ""}${v.address ? `\n${v.address}` : ""}` : "Henry's Pitch - Kabalagala\nBehind Shell Kabalagala";
      const date = posterDate(list[0].kickoff);
      const played = list.some((m) => m.status === "FULL_TIME");
      return {
        key: String(md),
        label: `Matchday ${md} · ${date.replace(/ \. /g, " ")}${played ? (list.every((m) => m.status === "FULL_TIME") ? " (played)" : " (in progress)") : ""}`,
        fixtures: { kind: "fixtures", season: season.name, title: `Matchday ${md}`, date, matches: lines, venue },
        results: played ? { kind: "results", season: season.name, title: `Matchday ${md}`, date, matches: lines, venue } : null,
      } satisfies MatchdayOption;
    });
  // Open on the next matchday to be played (or the last one when the season is over)
  const next = [...byMd.entries()].sort((a, b) => a[0] - b[0]).find(([, l]) => l.some((m) => m.status !== "FULL_TIME"))?.[0];
  return { tableSpec, scorersSpec, matchdays, defaultKey: next ? String(next) : matchdays.at(-1)?.key };
}

export default async function Exports() {
  const u = await requirePermission("exports");
  const [seasons, posters] = await Promise.all([getSeasonsForAdmin().then((l) => l.filter((s) => s.isCurrent)), posterData()]);
  const dl = <Icon name="download" />;
  return (
    <>
      <PageHeader eyebrow="Graphics for social media, and CSV files for Excel" title="Reports & exports" />

      {posters && (
        <section className="mb-12">
          <div className="eyebrow mb-4">Match-day graphics</div>
          <PosterStudio table={posters.tableSpec} scorers={posters.scorersSpec} matchdays={posters.matchdays} defaultKey={posters.defaultKey} />
        </section>
      )}

      <div className="eyebrow mb-4">Spreadsheets (CSV)</div>
      <div className="grid gap-4 md:grid-cols-2">
        {seasons.map((s) => (
          <DownloadCard key={`st-${s.id}`} href={`/api/export/standings?season=${s.id}`} title={`${s.competition.name} standings`} body={`${s.name} table with form, goals and points`} icon={dl} />
        ))}
        {seasons.map((s) => (
          <DownloadCard key={`fx-${s.id}`} href={`/api/export/fixtures?season=${s.id}`} title={`${s.competition.name} fixtures and results`} body={`Every match in ${s.name}`} icon={dl} />
        ))}
        <DownloadCard href="/api/export/players" title="Player statistics" body="All registered players with goals, assists, cards and appearances" icon={dl} />
        {can(u.role, "payments") && <DownloadCard href="/api/export/members" title="Members and payments" body="Accounts with membership status and payment dates" icon={dl} />}
        {can(u.role, "activity") && <DownloadCard href="/api/export/activity" title="Activity history" body="Full audit trail of administrative actions" icon={dl} />}
      </div>
    </>
  );
}
