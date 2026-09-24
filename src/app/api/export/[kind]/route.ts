import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import * as s from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getMatches, getPlayerStats, getSeasonTable, getGroupTables } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";

function csv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const x = v == null ? "" : String(v);
          return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
        })
        .join(","),
    )
    .join("\n");
}

export async function GET(req: Request, { params }: { params: { kind: string } }) {
  const u = await getCurrentUser();
  if (!u || !can(u.role, "exports")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const url = new URL(req.url);
  const seasonId = url.searchParams.get("season");
  let rows: (string | number | null)[][] = [];
  let name = params.kind;

  if (params.kind === "standings" && seasonId) {
    const season = await db.query.seasons.findFirst({ where: eq(s.seasons.id, seasonId), with: { competition: true } });
    name = `${season?.competition.name ?? "standings"}-${season?.name ?? ""}-standings`;
    const header = ["Group", "Pos", "Club", "P", "W", "D", "L", "GF", "GA", "GD", "Pts", "Form"];
    const groups = season?.competition.type === "CHAMPIONS" ? await getGroupTables(seasonId) : [{ name: "", rows: await getSeasonTable(seasonId) }];
    rows = [header, ...groups.flatMap((g) => g.rows.map((r) => [g.name, r.position, r.team.name, r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.goalDifference, r.points, r.form.join("")]))];
  } else if (params.kind === "fixtures" && seasonId) {
    const ms = await getMatches({ seasonId });
    name = "fixtures";
    rows = [["Round", "Kick-off", "Home", "Away", "Home score", "Away score", "Pens", "Status", "Venue"], ...ms.map((m) => [m.round, fmtDateTime(m.kickoff), m.homeTeam?.name ?? "TBD", m.awayTeam?.name ?? "TBD", m.homeScore, m.awayScore, m.homePens != null ? `${m.homePens}-${m.awayPens}` : "", m.status, m.venue?.name ?? ""])];
  } else if (params.kind === "players") {
    const ps = await getPlayerStats({ includePending: true });
    rows = [["Club", "Number", "First name", "Last name", "Position", "Completed", "Status", "Apps", "Goals", "Assists", "Clean sheets", "Yellow", "Red", "POTM"], ...ps.map((p) => [p.teamName, p.number, p.firstName, p.lastName, p.position, p.completionYear ?? "", p.status, p.apps, p.goals, p.assists, p.cleanSheets, p.yellows, p.reds, p.potm])];
  } else if (params.kind === "members") {
    const { rows: r } = await pool.query("select name, email, phone, role, membership, membership_paid_at, created_at from users order by created_at desc");
    rows = [["Name", "Email", "Phone", "Role", "Membership", "Paid at", "Joined"], ...r.map((x: Record<string, string | Date | null>) => [x.name as string, x.email as string, x.phone as string, x.role as string, x.membership as string, x.membership_paid_at ? fmtDateTime(x.membership_paid_at as Date) : "", fmtDateTime(x.created_at as Date)])];
  } else if (params.kind === "activity") {
    const list = await db.query.activityLogs.findMany({ with: { user: true }, orderBy: desc(s.activityLogs.createdAt), limit: 5000 });
    rows = [["When", "User", "Action", "Area", "Details"], ...list.map((a) => [fmtDateTime(a.createdAt), a.user?.name ?? "System", a.action, a.entity, a.details])];
  } else return NextResponse.json({ error: "Unknown export" }, { status: 404 });

  const file = `bosa-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  return new NextResponse("﻿" + csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"` },
  });
}
