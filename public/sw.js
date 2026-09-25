/* BOSA service worker: makes the site installable, shows a friendly page when offline, and shows
   push notifications (match reminders, goals, results, announcements).
   Pages always come fresh from the network (scores change); only static files are cached. */
const CACHE = "bosa-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png", "/crests/bosa-logo.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  // Hashed build files, crests and icons never change: cache first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/crests/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

/* ---------------- Push notifications ---------------- */

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }
  const title = data.title || "BOSA League";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png", // white silhouette: Android draws it in the status bar
    tag: data.tag || undefined,
    renotify: !!data.tag, // a new goal in the same match still buzzes
    data: { url: typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/", type: data.type || "GENERAL" },
  };
  // iOS requires every push to show a notification, so always show one
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      // Reuse an open BOSA window if there is one
      const open = list.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if (open.url !== target && "navigate" in open) return open.navigate(target).catch(() => self.clients.openWindow(target));
        return;
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("notificationclose", () => {
  // Nothing to do: dismissing a notification needs no follow-up. Kept so the behaviour is explicit.
});

// The browser replaced the subscription (keys rotated or expired): save the new one for the signed-in member
self.addEventListener("pushsubscriptionchange", (e) => {
  const key = e.oldSubscription && e.oldSubscription.options && e.oldSubscription.options.applicationServerKey;
  if (!key) return;
  e.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: key })
      .then((sub) =>
        fetch("/api/push/subscribe", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) }),
      )
      .catch(() => {}),
  );
});
