import "server-only";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";
import { requireUser, type CurrentUser } from "./auth";
import { can, type Permission } from "./roles";
import { fail } from "./result";
import type { ActionResult } from "@/components/form";

export class Denied extends Error {}

/** Runs an admin action with a permission check, friendly errors and cache refresh. */
export async function guarded(perm: Permission | ((u: CurrentUser) => boolean), fn: (u: CurrentUser) => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const u = await requireUser("/admin");
    const allowed = typeof perm === "function" ? perm(u) : can(u.role, perm);
    if (!allowed) return fail("You do not have permission to do that.");
    const r = await fn(u);
    // Any change in the control room (a result, a new club, a schedule edit) may move the season on
    if (r?.ok) {
      const { runSeasonEngine } = await import("./season-engine");
      await runSeasonEngine().catch((e) => console.error("Season engine:", e));
    }
    revalidatePath("/", "layout");
    return r;
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error(e);
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    if (/duplicate key/i.test(msg)) return fail("That record already exists.");
    if (e instanceof Denied) return fail(msg);
    return fail(msg.length < 160 ? msg : "Something went wrong. Please try again.");
  }
}
