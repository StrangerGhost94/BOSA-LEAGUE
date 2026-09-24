"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice, getSetting } from "@/lib/data";
import { submitOrder, pesapalConfigured, demoPaymentsEnabled } from "@/lib/pesapal";
import { activateMembership } from "@/lib/payments";
import { fail } from "@/lib/result";
import type { ActionResult } from "@/components/form";

export async function startPaymentAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/membership");
  if (hasMembership(user)) return fail("Your membership is already active.");
  const amount = await getMembershipPrice();
  const currency = await getSetting("membership_currency", "UGX");
  const merchantRef = `BOSA-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const phone = (fd.get("phone") as string | null)?.trim() || user.phone;

  if (!pesapalConfigured()) {
    if (demoPaymentsEnabled()) {
      await db.insert(payments).values({ userId: user.id, amount, currency, merchantRef, status: "COMPLETED", provider: "DEMO", method: "Demo mode", confirmationCode: "DEMO" });
      await activateMembership(user.id, "Demo payment");
      redirect("/membership?success=1");
    }
    return fail("Online payments are not configured yet. Please contact the League office.");
  }

  const [first, ...rest] = user.name.split(" ");
  let redirectUrl: string;
  try {
    await db.insert(payments).values({ userId: user.id, amount, currency, merchantRef, status: "PENDING" });
    const order = await submitOrder({
      merchantRef,
      amount,
      currency,
      description: "BOSA League one-time membership",
      email: user.email,
      phone,
      firstName: first,
      lastName: rest.join(" ") || first,
    });
    await db.update(payments).set({ orderTrackingId: order.order_tracking_id }).where(eq(payments.merchantRef, merchantRef));
    redirectUrl = order.redirect_url;
  } catch (e) {
    console.error(e);
    await db.update(payments).set({ status: "FAILED" }).where(eq(payments.merchantRef, merchantRef));
    return fail("We could not reach Pesapal just now. Please try again in a moment.");
  }
  redirect(redirectUrl);
}
