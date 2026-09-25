"use client";

import { useEffect } from "react";
import { currentSubscription, pushEnv, subscribeDevice, unsubscribeDevice } from "@/lib/push-client";

/**
 * Runs quietly once per app start. Never asks for permission (that only happens when the member taps Enable).
 * - Member who already allowed notifications: re-saves this device, so an expired or rotated subscription heals itself.
 * - Signed out on this device: switches its notifications off, so the last account's alerts stop.
 */
export function PushSync({ signedIn, member, publicKey }: { signedIn: boolean; member: boolean; publicKey: string | null }) {
  useEffect(() => {
    const env = pushEnv();
    if (!env.supported || !publicKey) return;
    const run = async () => {
      if (!signedIn) {
        if (await currentSubscription()) await unsubscribeDevice();
        return;
      }
      if (member && Notification.permission === "granted") await subscribeDevice(publicKey);
    };
    const t = setTimeout(() => run().catch(() => {}), 2500);
    return () => clearTimeout(t);
  }, [signedIn, member, publicKey]);
  return null;
}
