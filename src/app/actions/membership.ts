"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice, getSetting } from "@/lib/data";
import { submitOrder, pesapalConfigured } from "@/lib/pesapal";
import { headers } from "next/headers";
import { redeemVoucher } from "@/lib/vouchers";
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

  if (!pesapalConfigured()) return fail("Online payment is not available yet. Please use a membership voucher from the League office.");

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

/** A signed-in old student activates membership with a one-time voucher code. */
export async function redeemVoucherAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/membership");
  if (hasMembership(user)) return fail("Your membership is already active.");
  const code = String(fd.get("voucher") ?? "").trim();
  if (!code) return fail("Enter the voucher code printed on your card.");
  // Wrong guesses are limited per account and per connection
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const r = await redeemVoucher(user.id, code, `ip:${ip}`);
  if (!r.ok) return fail(r.message);
  redirect("/members?welcome=1");
}
