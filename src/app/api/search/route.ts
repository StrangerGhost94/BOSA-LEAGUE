import { NextResponse } from "next/server";
import { ilike, or, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { teams, players, articles } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  // Clubs, players and stories are members-only, so search is too
  if (!hasMembership(await getCurrentUser())) return NextResponse.json({ results: [], membersOnly: true });
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const [ts, ps, as] = await Promise.all([
    db.query.teams.findMany({ where: or(ilike(teams.name, like), ilike(teams.campus, like)), limit: 5 }),
    db.query.players.findMany({
      where: and(or(ilike(players.firstName, like), ilike(players.lastName, like)), ne(players.status, "REJECTED"), ne(players.status, "PENDING")),
      with: { team: true },
      limit: 6,
    }),
    db.query.articles.findMany({ where: and(ilike(articles.title, like)), limit: 4 }),
  ]);
  const results = [
    ...ts.map((t) => ({ type: "Club", label: t.name, sub: t.campus, href: `/teams/${t.slug}`, crest: t.crest })),
    ...ps.map((p) => ({ type: "Player", label: `${p.firstName} ${p.lastName}`, sub: `#${p.number} · ${p.team.name}`, href: `/players/${p.id}`, crest: p.team.crest })),
    ...as.filter((a) => a.published).map((a) => ({ type: "Story", label: a.title, href: `/news/${a.slug}` })),
  ];
  return NextResponse.json({ results });
}
