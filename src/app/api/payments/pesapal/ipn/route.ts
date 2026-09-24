import { NextResponse } from "next/server";
import { syncPayment } from "@/lib/payments";

// Pesapal Instant Payment Notification (registered as GET)
async function handle(req: Request) {
  const url = new URL(req.url);
  let trackingId = url.searchParams.get("OrderTrackingId");
  let merchantRef = url.searchParams.get("OrderMerchantReference");
  let type = url.searchParams.get("OrderNotificationType") ?? "IPNCHANGE";
  if (!trackingId && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as Record<string, string>;
    trackingId = body.OrderTrackingId;
    merchantRef = body.OrderMerchantReference;
    type = body.OrderNotificationType ?? type;
  }
  let status = 200;
  try {
    if (trackingId) await syncPayment(trackingId);
  } catch (e) {
    console.error("IPN sync failed", e);
    status = 500;
  }
  return NextResponse.json({ orderNotificationType: type, orderTrackingId: trackingId, orderMerchantReference: merchantRef, status });
}

export const GET = handle;
export const POST = handle;
