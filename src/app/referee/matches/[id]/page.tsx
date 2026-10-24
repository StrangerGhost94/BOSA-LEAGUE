import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { MatchConsole } from "@/components/admin/match-console";

export default async function RefMatch(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const u = await requireRole(["REFEREE"]);
  const m = await db.query.matches.findFirst({ where: eq(matches.id, params.id) });
  if (!m || m.refereeId !== u.id) notFound();
  return <MatchConsole id={params.id} mode="referee" />;
}
