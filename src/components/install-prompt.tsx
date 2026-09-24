"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BosaLogo, Icon } from "@/components/ui";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "android" | "ios" | null;

const KEY = "bosa-install-dismissed";
const WAIT_DAYS = 7;

function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return Date.now() - t < WAIT_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
function remember() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode: just close */
  }
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** "Install BOSA" sheet. Android and desktop Chrome get a one-tap install; iPhone and iPad get the Add to Home Screen steps. */
export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("android");
    };
    const onInstalled = () => {
      setOpen(false);
      remember();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (isIOS()) setMode("ios");

    // Anyone can open the sheet from the menu ("Get the BOSA app")
    const onAsk = () => setOpen(true);
    window.addEventListener("bosa:install", onAsk);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("bosa:install", onAsk);
    };
  }, []);

  // Offer it by itself a few seconds after arrival, not on top of the first impression
  useEffect(() => {
    if (!mode || recentlyDismissed()) return;
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [mode]);

  const close = useCallback(() => {
    setOpen(false);
    remember();
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setOpen(false);
    if (choice?.outcome !== "accepted") remember();
  }, [deferred]);

  if (pathname?.startsWith("/print")) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="shade"
            className="fixed inset-0 z-[80] bg-black/50 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-label="Install the BOSA app"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto w-full max-w-md pb-[max(12px,var(--safe-bottom))] pl-[max(12px,var(--safe-left))] pr-[max(12px,var(--safe-right))] sm:bottom-[calc(1.5rem+var(--safe-bottom))] sm:right-[max(1.5rem,var(--safe-right))] sm:left-auto sm:pb-0 sm:pl-0 sm:pr-0 sm:mx-0 sm:px-0"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-night-800 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 bg-[radial-gradient(closest-side,rgba(204,38,84,.35),rgba(204,38,84,0))]" />
              <button onClick={close} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-ivory/50 hover:bg-white/5" aria-label="Not now">
                <Icon name="close" size={16} />
              </button>
              <div className="relative flex items-center gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-night-900 ring-1 ring-gold/30">
                  <BosaLogo size={44} />
                </span>
                <div className="min-w-0 pr-8">
                  <div className="font-display text-xl tracking-[0.14em]">BOSA</div>
                  <div className="text-sm text-ivory/60">Live scores, fixtures and your member card on your home screen.</div>
                </div>
              </div>

              {mode === "ios" && !deferred ? (
                <ol className="relative mt-5 space-y-3 text-sm text-ivory/80">
                  <li className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-gold">1</span>
                    <span>
                      Tap the Share button
                      <svg viewBox="0 0 24 24" width="18" height="18" className="mx-1.5 inline -translate-y-0.5 text-[#0A84FF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
                        <path d="M12 3v12M8 7l4-4 4 4" />
                        <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                      </svg>
                      in the browser bar
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-gold">2</span>
                    <span>
                      Scroll and choose <span className="font-semibold text-ivory">Add to Home Screen</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 font-display text-gold">3</span>
                    <span>
                      Tap <span className="font-semibold text-ivory">Add</span>. BOSA appears with your apps.
                    </span>
                  </li>
                </ol>
              ) : deferred ? (
                <div className="relative mt-5 grid grid-cols-2 gap-3">
                  <button onClick={close} className="btn-ghost">
                    Not now
                  </button>
                  <button onClick={install} className="btn-primary">
                    Install
                  </button>
                </div>
              ) : (
                <p className="relative mt-5 text-sm text-ivory/70">
                  Open your browser menu and choose <span className="font-semibold text-ivory">Install app</span> or <span className="font-semibold text-ivory">Add to Home screen</span>.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
