import { NextResponse } from "next/server";
import { pushConfigured, vapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

/** The VAPID public key (safe to share; browsers need it to subscribe). The private key never leaves the server. */
export async function GET() {
  return NextResponse.json({ publicKey: pushConfigured() ? vapidPublicKey() : null });
}
