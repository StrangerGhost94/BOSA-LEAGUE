/** Browser helpers for push notifications. Only the VAPID public key is ever used here. */

export type PushEnv = {
  supported: boolean; // this browser can do Web Push right now
  ios: boolean;
  standalone: boolean; // opened from the Home Screen icon
  needsInstall: boolean; // iPhone/iPad in Safari: must add to Home Screen first (iOS 16.4+)
};

export function pushEnv(): PushEnv {
  if (typeof window === "undefined") return { supported: false, ios: false, standalone: false, needsInstall: false };
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { supported, ios, standalone, needsInstall: ios && !standalone };
}

function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

export async function swRegistration() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (!pushEnv().supported) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function save(sub: PushSubscription) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not save this device.");
}

/** Subscribes this device (permission must already be granted) and saves it for the signed-in member. */
export async function subscribeDevice(publicKey: string) {
  const reg = await swRegistration();
  const key = keyBytes(publicKey);
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an old server key can't receive: replace it
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await save(sub);
  return sub;
}

/** Turns notifications off on this device, in the browser and on the server. */
export async function unsubscribeDevice() {
  const sub = await currentSubscription();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub?.endpoint ?? "" }),
  }).catch(() => {});
  await sub?.unsubscribe().catch(() => {});
}
