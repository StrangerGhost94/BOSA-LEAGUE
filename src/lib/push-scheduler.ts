/**
 * Runs the match reminders every 5 minutes for as long as the server is up.
 * Started once from src/instrumentation.ts. Duplicate runs (several servers, restarts) are harmless:
 * every reminder is claimed once per person in notification_logs.
 */
import { pool } from "@/db";
import { pushConfigured, runMatchReminders } from "./push";

const g = globalThis as unknown as { __bosaPushTimer?: NodeJS.Timeout };

export function startPushScheduler() {
  if (g.__bosaPushTimer) return;
  if (!pushConfigured()) return; // logs once why push is off
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    const client = await pool.connect().catch(() => null);
    try {
      if (!client) return;
      // Only one server runs the job at a time
      const { rows } = await client.query("select pg_try_advisory_lock(424243) as ok");
      if (!rows[0].ok) return;
      try {
        const r = await runMatchReminders();
        if (r.sent) console.log(`[push] reminders delivered to ${r.sent} device(s)`);
      } finally {
        await client.query("select pg_advisory_unlock(424243)");
      }
    } catch (e) {
      console.error("[push] reminder job:", (e as Error).message);
    } finally {
      client?.release();
      running = false;
    }
  };
  g.__bosaPushTimer = setInterval(tick, 5 * 60_000);
  setTimeout(tick, 30_000);
  console.log("[push] match reminder job started (every 5 minutes)");
}
