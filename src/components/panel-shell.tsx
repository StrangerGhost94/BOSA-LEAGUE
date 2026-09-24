"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { BosaLogo, Icon, ICONS } from "@/components/ui";

export type PanelNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; exact?: boolean };

export function PanelShell({
  title,
  subtitle,
  nav,
  user,
  children,
}: {
  title: string;
  subtitle: string;
  nav: { section: string; items: PanelNavItem[] }[];
  user: { name: string; role: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  // While the phone menu is open: page behind it does not scroll, and Escape closes it
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const isActive = (i: PanelNavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  // `mobile` renders the copy inside the slide-out menu: links close it straight away, and it has its own close button
  const sidebar = (mobile: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3" onClick={() => mobile && setOpen(false)}>
          <BosaLogo size={38} />
          <div className="leading-none">
            <div className="font-display text-[15px] tracking-[0.14em]">{title}</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.3em] text-gold/80">{subtitle}</div>
          </div>
        </Link>
        {mobile && (
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10" onClick={() => setOpen(false)} aria-label="Close navigation">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-6 scrollbar-none" data-lenis-prevent>
        {nav.map((g) => (
          <div key={g.section}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ivory/30">{g.section}</div>
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const active = isActive(i);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => mobile && setOpen(false)}
                      className={clsx(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                        active ? "text-ivory" : "text-ivory/55 hover:bg-white/[0.04] hover:text-ivory",
                      )}
                    >
                      {active &&
                        (mobile ? (
                          <span className="absolute inset-0 rounded-xl border border-gold/25 bg-gradient-to-r from-gold/15 to-transparent" />
                        ) : (
                          <motion.span
                            layoutId="panel-active"
                            className="absolute inset-0 rounded-xl border border-gold/25 bg-gradient-to-r from-gold/15 to-transparent"
                            transition={{ type: "spring", stiffness: 400, damping: 34 }}
                          />
                        ))}
                      <Icon name={i.icon} size={17} className={clsx("relative", active && "text-gold")} />
                      <span className="relative flex-1">{i.label}</span>
                      {!!i.badge && <span className="relative rounded-full bg-crimson px-2 py-0.5 text-[10px] font-bold text-white">{i.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-sm text-night-900">
            {user.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-[10px] uppercase tracking-[0.16em] text-gold/70">{user.role}</div>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button className="grid h-8 w-8 place-items-center rounded-lg text-ivory/50 hover:bg-white/5 hover:text-ivory" aria-label="Sign out">
              <Icon name="logout" size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r pb-[var(--safe-bottom)] pl-[var(--safe-left)] pt-[var(--safe-top)] border-white/[0.06] bg-night-800/60 backdrop-blur-xl lg:block">{sidebar(false)}</aside>
      {/* Phone and tablet menu. Each animated piece is a direct, keyed child of AnimatePresence so it always
          finishes closing (a wrapping fragment left the dark overlay stuck over the page). */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel-overlay"
            className="fixed inset-0 z-40 bg-night-900/75 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={() => setOpen(false)}
          />
        )}
        {open && (
          <motion.aside
            key="panel-menu"
            role="dialog"
            aria-modal
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-[min(calc(284px+var(--safe-left)),88vw)] border-r border-white/[0.08] bg-night-800 pb-[var(--safe-bottom)] pl-[var(--safe-left)] pt-[var(--safe-top)] lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%", transition: { duration: 0.2, ease: "easeIn" } }}
            transition={{ type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {sidebar(true)}
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[calc(4rem+var(--safe-top))] items-center gap-3 border-b border-white/[0.06] bg-night-900/80 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-[var(--safe-top)] backdrop-blur-xl sm:pl-[max(2rem,var(--safe-left))] sm:pr-[max(2rem,var(--safe-right))]">
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("bosa:command"))}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-ivory/50 transition hover:border-gold/30 hover:text-ivory"
          >
            <Icon name="search" size={14} /> Quick search
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="btn-quiet btn-sm">
              View site <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        </header>
        <motion.main key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="pb-[calc(2rem+var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-8 sm:pl-[max(2rem,var(--safe-left))] sm:pr-[max(2rem,var(--safe-right))] lg:pb-[calc(2.5rem+var(--safe-bottom))] lg:pt-10">
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="headline text-4xl sm:text-5xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
