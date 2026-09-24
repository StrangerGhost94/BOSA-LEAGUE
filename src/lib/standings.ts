/**
 * Standings are always derived from match results, so points update automatically
 * the moment a result is recorded, edited or removed.
 */
export type ResultLike = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  kickoff: Date | string;
  countsInTable?: boolean;
};

export type Baseline = { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; form: string };

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[]; // most recent last
  position: number;
  live: boolean;
};

export function computeStandings(
  teamIds: string[],
  matches: ResultLike[],
  opts: { win?: number; draw?: number; includeLive?: boolean; adjustments?: Record<string, number>; baselines?: Record<string, Baseline> } = {},
): StandingRow[] {
  const win = opts.win ?? 3;
  const draw = opts.draw ?? 1;
  const rows = new Map<string, StandingRow>();
  for (const id of teamIds) {
    const b = opts.baselines?.[id];
    rows.set(id, {
      teamId: id,
      played: b?.played ?? 0,
      won: b?.won ?? 0,
      drawn: b?.drawn ?? 0,
      lost: b?.lost ?? 0,
      goalsFor: b?.goalsFor ?? 0,
      goalsAgainst: b?.goalsAgainst ?? 0,
      goalDifference: 0,
      points: (opts.adjustments?.[id] ?? 0) + (b ? b.won * win + b.drawn * draw : 0),
      form: (b?.form ?? "").split("").filter((c): c is "W" | "D" | "L" => c === "W" || c === "D" || c === "L"),
      position: 0,
      live: false,
    });
  }
  const counted = matches
    .filter(
      (m) =>
        m.homeTeamId &&
        m.awayTeamId &&
        m.countsInTable !== false &&
        m.homeScore != null &&
        m.awayScore != null &&
        (m.status === "FULL_TIME" || (opts.includeLive && (m.status === "LIVE" || m.status === "HALF_TIME"))),
    )
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  for (const m of counted) {
    const h = rows.get(m.homeTeamId!);
    const a = rows.get(m.awayTeamId!);
    if (!h || !a) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    const isLive = m.status !== "FULL_TIME";
    h.played++;
    a.played++;
    h.goalsFor += hs;
    h.goalsAgainst += as;
    a.goalsFor += as;
    a.goalsAgainst += hs;
    if (isLive) {
      h.live = true;
      a.live = true;
    }
    if (hs > as) {
      h.won++;
      a.lost++;
      h.points += win;
      h.form.push("W");
      a.form.push("L");
    } else if (hs < as) {
      a.won++;
      h.lost++;
      a.points += win;
      a.form.push("W");
      h.form.push("L");
    } else {
      h.drawn++;
      a.drawn++;
      h.points += draw;
      a.points += draw;
      h.form.push("D");
      a.form.push("D");
    }
  }

  const list = Array.from(rows.values()).map((r) => ({
    ...r,
    goalDifference: r.goalsFor - r.goalsAgainst,
    form: r.form.slice(-5),
  }));

  // Head-to-head helper for tie-breaks
  const h2h = (x: string, y: string) => {
    let px = 0;
    let py = 0;
    for (const m of counted) {
      if (m.homeTeamId === x && m.awayTeamId === y) {
        if (m.homeScore! > m.awayScore!) px += win;
        else if (m.homeScore! < m.awayScore!) py += win;
        else {
          px += draw;
          py += draw;
        }
      } else if (m.homeTeamId === y && m.awayTeamId === x) {
        if (m.homeScore! > m.awayScore!) py += win;
        else if (m.homeScore! < m.awayScore!) px += win;
        else {
          px += draw;
          py += draw;
        }
      }
    }
    return py - px;
  };

  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      h2h(a.teamId, b.teamId) ||
      a.teamId.localeCompare(b.teamId),
  );
  list.forEach((r, i) => (r.position = i + 1));
  return list;
}
