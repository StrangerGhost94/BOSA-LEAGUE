"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Icon } from "@/components/ui";

const DrawerCtx = createContext<{ close: () => void } | null>(null);
export const useDrawer = () => useContext(DrawerCtx);

export function Drawer({
  label,
  title,
  description,
  children,
  buttonClass = "btn-primary btn-sm",
  side = "right",
  icon,
  defaultOpen,
}: {
  label: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  buttonClass?: string;
  side?: "right" | "center";
  icon?: "plus" | "settings" | "calendar" | "check" | "whistle";
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        {icon && <Icon name={icon} size={14} />}
        {label}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {/* Keyed, direct children of AnimatePresence, so the overlay always goes away when the drawer closes */}
            {open && (
              <motion.div
                key="drawer-overlay"
                className="fixed inset-0 z-[85] bg-night-900/75"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                onClick={() => setOpen(false)}
              />
            )}
            {open && (
                <motion.div
                  key="drawer-panel"
                  role="dialog"
                  aria-modal
                  aria-label={title}
                  className={clsx(
                    "fixed z-[86] flex flex-col overflow-hidden border border-white/[0.08] bg-night-800 shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)]",
                    side === "right"
                      ? "inset-y-0 right-0 w-full max-w-xl pb-[var(--safe-bottom)] pr-[var(--safe-right)] pt-[var(--safe-top)] sm:rounded-l-3xl"
                      : "left-1/2 top-1/2 max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-2rem)] w-[calc(100%-2rem-var(--safe-left)-var(--safe-right))] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl",
                  )}
                  initial={side === "right" ? { x: "100%" } : { opacity: 0, scale: 0.95, y: "-46%", x: "-50%" }}
                  animate={side === "right" ? { x: 0 } : { opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
                  exit={side === "right" ? { x: "100%" } : { opacity: 0, scale: 0.97, y: "-48%", x: "-50%" }}
                  transition={{ type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[radial-gradient(closest-side,rgba(204,38,84,0.20),rgba(204,38,84,0))]" />
                  <div className="relative flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
                    <div>
                      <h2 className="font-serif text-2xl">{title}</h2>
                      {description && <p className="mt-1 text-sm text-ivory/50">{description}</p>}
                    </div>
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 hover:border-gold/40" onClick={() => setOpen(false)} aria-label="Close">
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  <div className="relative flex-1 overflow-y-auto overscroll-contain px-6 py-6" data-lenis-prevent>
                    <DrawerCtx.Provider value={{ close: () => setOpen(false) }}>{children}</DrawerCtx.Provider>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
