import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export async function getReferees() {
  return db.query.users.findMany({ where: eq(s.users.role, "REFEREE"), orderBy: asc(s.users.name), columns: { id: true, name: true } });
}

export async function getAllSeasons() {
  return db.query.seasons.findMany({ with: { competition: true, groups: { orderBy: asc(s.groups.order) } }, orderBy: [asc(s.seasons.competitionId)] });
}
