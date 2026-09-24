import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { getTransactionStatus } from "./pesapal";
import { logActivity } from "./activity";

/** Checks Pesapal for the latest status of a payment and activates membership when it completes. */
export async function syncPayment(orderTrackingId: string) {
  const p = await db.query.payments.findFirst({ where: eq(payments.orderTrackingId, orderTrackingId) });
  if (!p) return null;
  if (p.status === "COMPLETED") return p;
  const st = await getTransactionStatus(orderTrackingId);
  const status = st.status_code === 1 ? "COMPLETED" : st.status_code === 2 || st.status_code === 3 ? "FAILED" : "PENDING";
  const [updated] = await db
    .update(payments)
    .set({ status, method: st.payment_method, confirmationCode: st.confirmation_code, updatedAt: new Date() })
    .where(eq(payments.id, p.id))
    .returning();
  if (status === "COMPLETED") await activateMembership(p.userId, `Pesapal ${st.payment_method ?? ""} ${st.confirmation_code ?? ""}`.trim());
  return updated;
}

export async function activateMembership(userId: string, details: string) {
  await db.update(users).set({ membership: "ACTIVE", membershipPaidAt: new Date() }).where(eq(users.id, userId));
  await logActivity(userId, "Membership activated", "User", details, userId);
}
