import type { MatchFull } from "@/lib/data";
import type { BracketMatch } from "@/components/bracket";
import { winnerOf } from "@/lib/match-service";
import { fmtDate, fmtTime } from "@/lib/format";

export function toBracket(m: MatchFull): BracketMatch {
  const t = (x: MatchFull["homeTeam"]) => (x ? { id: x.id, name: x.name, crest: x.crest, primaryColor: x.primaryColor, shortName: x.shortName } : null);
  return {
    id: m.id,
    slot: m.bracketSlot ?? 1,
    home: t(m.homeTeam),
    away: t(m.awayTeam),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePens: m.homePens,
    awayPens: m.awayPens,
    status: m.status,
    when: `${fmtDate(m.kickoff, { day: "numeric", month: "short" })} · ${fmtTime(m.kickoff)}`,
    winnerId: winnerOf(m),
  };
}
