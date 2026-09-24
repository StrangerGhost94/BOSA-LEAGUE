"use server";

import { db } from "@/db";
import { teamApplications } from "@/db/schema";
import { fail, ok, str, optStr } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/components/form";

export async function applyTeamAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const teamName = str(fd, "teamName");
  const contactName = str(fd, "contactName");
  const email = str(fd, "email");
  const phone = str(fd, "phone");
  const campus = str(fd, "campus");
  if (!teamName || !contactName || !email || !phone || !campus) return fail("Please complete every required field.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
  const squad = parseInt(str(fd, "squadSize"), 10);
  await db.insert(teamApplications).values({
    teamName,
    contactName,
    email,
    phone,
    campus,
    affiliation: "ALUMNI",
    squadSize: Number.isFinite(squad) ? squad : null,
    message: optStr(fd, "message"),
  });
  await logActivity(null, "Team application received", "TeamApplication", `${teamName} (${campus})`);
  return ok("Application received. The Competitions Desk will contact you within fourteen days.");
}
