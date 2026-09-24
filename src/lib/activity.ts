import { db } from "@/db";
import { activityLogs } from "@/db/schema";

export async function logActivity(userId: string | null, action: string, entity: string, details?: string, entityId?: string) {
  try {
    await db.insert(activityLogs).values({ userId, action, entity, details, entityId });
  } catch (e) {
    console.error("activity log failed", e);
  }
}
