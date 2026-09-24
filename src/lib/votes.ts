import "server-only";
import { pool } from "@/db";

export type VoteTally = { playerId: string; name: string; teamName: string; crest: string; votes: number };

export async function tally(where: { matchId?: string; month?: string }): Promise<VoteTally[]> {
  const { rows } = await pool.query(
    `select v.player_id "playerId", trim(p.first_name || ' ' || p.last_name) name, t.name "teamName", t.crest, count(*)::int votes
     from votes v join players p on p.id = v.player_id join teams t on t.id = p.team_id
     where ($1::text is null or v.match_id = $1) and ($2::text is null or v.month = $2)
     group by v.player_id, p.first_name, p.last_name, t.name, t.crest
     order by votes desc, name asc`,
    [where.matchId ?? null, where.month ?? null],
  );
  return rows;
}

export async function myVote(userId: string, where: { matchId?: string; month?: string }) {
  const { rows } = await pool.query(
    "select player_id from votes where user_id = $1 and (($2::text is not null and match_id = $2) or ($3::text is not null and month = $3)) limit 1",
    [userId, where.matchId ?? null, where.month ?? null],
  );
  return (rows[0]?.player_id as string | undefined) ?? null;
}

export async function pastMonthWinners(limit = 12) {
  const { rows } = await pool.query(
    `select distinct on (v.month) v.month, trim(p.first_name || ' ' || p.last_name) name, t.name "teamName", t.crest, count(*) over (partition by v.month, v.player_id)::int votes
     from votes v join players p on p.id = v.player_id join teams t on t.id = p.team_id
     where v.kind = 'MONTH'
     order by v.month desc, votes desc
     limit $1`,
    [limit],
  );
  return rows as { month: string; name: string; teamName: string; crest: string; votes: number }[];
}
