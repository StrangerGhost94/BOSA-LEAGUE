import type { VoteTally } from "@/lib/votes";

export function VoteResults({ rows, mine, limit = 8 }: { rows: VoteTally[]; mine?: string | null; limit?: number }) {
  const total = rows.reduce((a, r) => a + r.votes, 0);
  if (!total) return <p className="text-sm text-ivory/45">No votes yet. Be the first.</p>;
  return (
    <div>
      <ul className="space-y-3">
        {rows.slice(0, limit).map((r, i) => {
          const pct = Math.round((r.votes / total) * 100);
          return (
            <li key={r.playerId}>
              <div className="mb-1 flex items-center gap-2 text-sm">
                <img src={r.crest} alt="" className="h-5 w-5 rounded-full bg-white" />
                <span className={i === 0 ? "font-semibold text-gold-300" : ""}>{r.name}</span>
                <span className="text-xs text-ivory/40">{r.teamName}</span>
                {mine === r.playerId && <span className="rounded-full bg-gold/15 px-2 text-[10px] uppercase tracking-[0.14em] text-gold">Your vote</span>}
                <span className="ml-auto font-display tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="bar-grow h-full rounded-full bg-gradient-to-r from-crimson to-gold" style={{ width: `${pct}%`, animationDelay: `${i * 80}ms` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ivory/40">{total} vote{total === 1 ? "" : "s"}</p>
    </div>
  );
}
