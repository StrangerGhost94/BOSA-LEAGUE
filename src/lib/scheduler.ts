/**
 * Pure fixture-planning helpers (no database access), so they can be tested on their own.
 * All days are "YYYY-MM-DD" strings in East Africa Time (UTC+3, no daylight saving).
 */

export type Pair = [string, string];

const DAY = 24 * 60 * 60 * 1000;
const EAT = 3 * 60 * 60 * 1000;

/** Calendar day in Kampala for a moment in time */
export function eatDay(d: Date): string {
  return new Date(d.getTime() + EAT).toISOString().slice(0, 10);
}
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}
export function weekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
}
/** The first Sunday strictly after the given day */
export function nextSunday(day: string): string {
  const w = weekday(day);
  return addDays(day, w === 0 ? 7 : 7 - w);
}
/** A moment on a Kampala calendar day, e.g. at("2026-10-25", "10:00") */
export function at(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+03:00`);
}

/** Kick-off slots on a matchday: the first match at 10:00, then one every hour. */
export const FIRST_KICKOFF_HOUR = 10;
export function slotTime(i: number): string {
  return `${String(FIRST_KICKOFF_HOUR + i).padStart(2, "0")}:00`;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Full single round robin by the circle method. Every club meets every other club once.
 * With an odd number of clubs, one club rests (has a bye) each matchday.
 */
export function roundRobin(teamIds: string[]): Pair[][] {
  const list: (string | null)[] = [...teamIds];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds: Pair[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (!a || !b) continue;
      round.push([a, b]);
    }
    rounds.push(round);
    // Keep the first club fixed and rotate the rest
    list.splice(1, 0, list.pop()!);
  }
  // Share home and away fairly: the club with fewer home games so far is at home
  const homes = new Map<string, number>();
  const lastHome = new Map<string, boolean>();
  return rounds.map((round) =>
    round.map(([a, b]) => {
      const ha = homes.get(a) ?? 0;
      const hb = homes.get(b) ?? 0;
      const aHome = ha !== hb ? ha < hb : lastHome.get(a) === lastHome.get(b) ? a < b : !lastHome.get(a);
      const p: Pair = aHome ? [a, b] : [b, a];
      homes.set(p[0], (homes.get(p[0]) ?? 0) + 1);
      lastHome.set(p[0], true);
      lastHome.set(p[1], false);
      return p;
    }),
  );
}

/**
 * Splits the pairings still to be played into matchdays where no club plays twice on the same day,
 * using as few matchdays as possible. Used to finish a season whose early fixtures were published by hand.
 */
export function planRemaining(pairs: Pair[]): Pair[][] {
  if (!pairs.length) return [];
  const deg = (edges: Pair[]) => {
    const d = new Map<string, number>();
    for (const [a, b] of edges) {
      d.set(a, (d.get(a) ?? 0) + 1);
      d.set(b, (d.get(b) ?? 0) + 1);
    }
    return d;
  };
  let steps = 0;
  const LIMIT = 300_000;

  function decompose(edges: Pair[], k: number): Pair[][] | null {
    if (!edges.length) return [];
    if (k <= 0 || ++steps > LIMIT) return null;
    const d = deg(edges);
    const verts = [...d.keys()].sort((x, y) => d.get(y)! - d.get(x)!);
    const tight = new Set(verts.filter((v) => d.get(v)! >= k));
    if ([...d.values()].some((x) => x > k)) return null;
    const adj = new Map<string, string[]>();
    for (const [a, b] of edges) {
      adj.set(a, [...(adj.get(a) ?? []), b]);
      adj.set(b, [...(adj.get(b) ?? []), a]);
    }
    const used = new Set<string>();
    const chosen: Pair[] = [];

    const pick = (i: number): Pair[][] | null => {
      if (++steps > LIMIT) return null;
      while (i < verts.length && used.has(verts[i])) i++;
      if (i >= verts.length) {
        const chosenKeys = new Set(chosen.map(([a, b]) => key(a, b)));
        const rest = edges.filter(([a, b]) => !chosenKeys.has(key(a, b)));
        const r = decompose(rest, k - 1);
        return r ? [[...chosen], ...r] : null;
      }
      const v = verts[i];
      used.add(v);
      for (const w of adj.get(v) ?? []) {
        if (used.has(w)) continue;
        used.add(w);
        chosen.push([v, w]);
        const r = pick(i + 1);
        if (r) return r;
        chosen.pop();
        used.delete(w);
      }
      if (!tight.has(v)) {
        const r = pick(i + 1);
        if (r) return r;
      }
      used.delete(v);
      return null;
    };
    return pick(0);
  }

  const maxDeg = Math.max(...deg(pairs).values());
  const exact = decompose(pairs, maxDeg);
  if (exact) return exact;

  // Fallback: greedy matchdays (may need an extra matchday or two)
  const left = [...pairs];
  const rounds: Pair[][] = [];
  while (left.length) {
    const busy = new Set<string>();
    const round: Pair[] = [];
    for (let i = 0; i < left.length; ) {
      const [a, b] = left[i];
      if (!busy.has(a) && !busy.has(b)) {
        busy.add(a);
        busy.add(b);
        round.push(left[i]);
        left.splice(i, 1);
      } else i++;
    }
    rounds.push(round);
  }
  return rounds;
}

/** Chooses the home side: the club with fewer home games so far goes first. Updates the counts. */
export function orient([a, b]: Pair, homes: Map<string, number>): Pair {
  const ha = homes.get(a) ?? 0;
  const hb = homes.get(b) ?? 0;
  const pair: Pair = ha <= hb ? [a, b] : [b, a];
  homes.set(pair[0], (homes.get(pair[0]) ?? 0) + 1);
  return pair;
}

/** Knock-out draw by league position, arranged so the top two seeds can only meet in the final. */
export function seededBracket(seeds: string[]): { stage: "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL"; ties: Pair[] } | null {
  const n = seeds.length >= 8 ? 8 : seeds.length >= 4 ? 4 : seeds.length >= 2 ? 2 : 0;
  if (!n) return null;
  const s = (i: number) => seeds[i - 1];
  if (n === 8) return { stage: "QUARTER_FINAL", ties: [[s(1), s(8)], [s(4), s(5)], [s(2), s(7)], [s(3), s(6)]] };
  if (n === 4) return { stage: "SEMI_FINAL", ties: [[s(1), s(4)], [s(2), s(3)]] };
  return { stage: "FINAL", ties: [[s(1), s(2)]] };
}

export { key as pairKey };
