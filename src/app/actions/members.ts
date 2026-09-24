"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matches, players, votes } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { currentMonth, matchVoteOpen } from "@/lib/members";
import { fail, ok, str } from "@/lib/result";
import type { ActionResult } from "@/components/form";

/** One vote per member per match (changeable while voting is open). */
export async function voteMatchAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const u = await getCurrentUser();
  if (!u) return fail("Sign in to vote.");
  if (!hasMembership(u)) return fail("Voting is for BOSA League members.");
  const matchId = str(fd, "matchId");
  const playerId = str(fd, "playerId");
  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!m) return fail("Match not found.");
  if (!matchVoteOpen(m)) return fail("Voting for this match has closed.");
  const p = await db.query.players.findFirst({ where: and(eq(players.id, playerId), or(eq(players.teamId, m.homeTeamId ?? ""), eq(players.teamId, m.awayTeamId ?? ""))) });
  if (!p) return fail("Choose a player from one of the two teams.");
  await db
    .insert(votes)
    .values({ kind: "MATCH", matchId, userId: u.id, playerId })
    .onConflictDoUpdate({ target: [votes.matchId, votes.userId], set: { playerId, createdAt: new Date() } });
  revalidatePath(`/matches/${matchId}`);
  return ok(`Vote saved for ${p.firstName} ${p.lastName}.`);
}

/** One vote per member per calendar month (changeable during the month). */
export async function voteMonthAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const u = await getCurrentUser();
  if (!u) return fail("Sign in to vote.");
  if (!hasMembership(u)) return fail("Voting is for BOSA League members.");
  const playerId = str(fd, "playerId");
  const p = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!p || p.status === "PENDING" || p.status === "REJECTED") return fail("Choose a registered player.");
  const month = currentMonth();
  await db
    .insert(votes)
    .values({ kind: "MONTH", month, userId: u.id, playerId })
    .onConflictDoUpdate({ target: [votes.month, votes.userId], set: { playerId, createdAt: new Date() } });
  revalidatePath("/vote");
  return ok(`Vote saved for ${p.firstName} ${p.lastName}.`);
}
