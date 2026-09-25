/** Runs once when the server starts. Starts the background match-reminder job (Node.js runtime only). */
export async function register() {
  // Written as an if-block so the Edge build drops the import entirely
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPushScheduler } = await import("./lib/push-scheduler");
    startPushScheduler();
  }
}
