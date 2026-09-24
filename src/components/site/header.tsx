"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { BosaLogo, Icon } from "@/components/ui";
import { Magnetic } from "@/components/motion";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/league", label: "League" },
  { href: "/champions-league", label: "Champions League" },
  { href: "/super-cup", label: "Super Cup" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/news", label: "Newsroom" },
  { href: "/members", label: "Members" },
];

type HeaderUser = { name: string; role: string; roleLabel: string; member: boolean; home: string } | null;

const MEMBER_LINKS = [
  { href: "/live", label: "Live", icon: "activity" as const },
  { href: "/members/card", label: "Card", icon: "card" as const },
  { href: "/vote", label: "Vote", icon: "trophy" as const },
  { href: "/gallery", label: "Gallery", icon: "grid" as const },
  { href: "/members/perks", label: "Perks", icon: "sparkle" as const },
];

export function SiteHeader({ user, liveCount = 0, seasonLabel = "" }: { user: HeaderUser; liveCount?: number; seasonLabel?: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "border-b border-white/[0.06] bg-night-900/90 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="container-x flex h-[68px] items-center gap-6 lg:h-[76px]">
          <Link href="/" className="group flex items-center gap-3" aria-label="BOSA League home">
            <BosaLogo size={38} className="transition-transform duration-500 group-hover:scale-105" />
            <span className="hidden whitespace-nowrap leading-none sm:block xl:hidden 2xl:block">
              <span className="block font-display text-[17px] font-semibold tracking-[0.12em] text-ivory">BOSA LEAGUE</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.34em] text-gold/80">{seasonLabel}</span>
            </span>
          </Link>

          <nav className="ml-2 hidden flex-1 items-center gap-4 whitespace-nowrap xl:flex 2xl:gap-6" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={clsx("nav-link", active(n.href) && "text-ivory")}>
                {n.label}
                {active(n.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {liveCount > 0 && (
              <Link href="/live" className="flex items-center gap-2 whitespace-nowrap rounded-full border border-crimson/50 bg-crimson/15 px-3 py-1.5 text-xs font-semibold text-crimson-400">
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-crimson-400" /> Live{liveCount > 1 ? ` (${liveCount})` : ""}
              </Link>
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("bosa:command"))}
              className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-xs text-ivory/55 transition hover:border-gold/40 hover:text-ivory md:inline-flex"
              aria-label="Search"
            >
              <Icon name="search" size={14} /> <span className="xl:hidden 2xl:inline">Search</span>
              <kbd className="hidden whitespace-nowrap rounded border border-white/10 px-1.5 py-0.5 font-sans text-[10px] text-ivory/40 2xl:inline">Ctrl K</kbd>
            </button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 text-sm transition hover:border-gold/40"
                  aria-expanded={menu}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-sm font-semibold text-night-900">
                    {user.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-ivory/80 sm:block xl:hidden 2xl:block">{user.name.split(" ")[0]}</span>
                </button>
                <AnimatePresence>
                  {menu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className="glass absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl p-2 shadow-2xl"
                    >
                      <div className="px-3 py-3">
                        <div className="truncate text-sm font-semibold">{user.name}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-gold/80">{user.roleLabel}</div>
                      </div>
                      <div className="my-1 h-px bg-white/5" />
                      <MenuLink href={user.home} icon="grid" label={user.home === "/account" ? "My account" : "My control panel"} />
                      {user.member && <MenuLink href="/members/card" icon="card" label="My member card" />}
                      {user.home !== "/account" && <MenuLink href="/account" icon="user" label="My account" />}
                      {!user.member && <MenuLink href="/membership" icon="card" label="Activate membership" />}
                      <form action="/api/auth/sign-out" method="post">
                        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ivory/70 transition hover:bg-white/5 hover:text-ivory">
                          <Icon name="logout" size={16} /> Sign out
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/sign-in" className="btn-quiet btn-sm hidden sm:inline-flex">
                  Sign in
                </Link>
                <Magnetic>
                  <Link href="/sign-up" className="btn-primary btn-sm">
                    Join the League
                  </Link>
                </Magnetic>
              </>
            )}
            <button
              className="ml-1 grid h-10 w-10 place-items-center rounded-full border border-white/10 xl:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-night-900/97 pb-[max(2rem,env(safe-area-inset-bottom))] backdrop-blur-2xl xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-crimson/20 blur-[120px]" />
            <div className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
            <div className="container-x sticky top-0 z-10 flex h-[68px] items-center justify-between bg-night-900/80 backdrop-blur">
              <BosaLogo size={36} />
              <button className="grid h-10 w-10 place-items-center rounded-full border border-white/10" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <motion.nav
              className="container-x relative mt-2 flex flex-col"
              initial="h"
              animate="s"
              variants={{ h: {}, s: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
            >
              {NAV.map((n, i) => (
                <motion.div
                  key={n.href}
                  variants={{ h: reduce ? { opacity: 0 } : { opacity: 0, x: -30 }, s: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                >
                  <Link
                    href={n.href}
                    className={clsx(
                      "flex items-baseline gap-4 border-b border-white/[0.06] py-3 font-serif text-2xl sm:py-4 sm:text-3xl",
                      active(n.href) ? "text-gold" : "text-ivory",
                    )}
                  >
                    <span className="font-sans text-[11px] tracking-[0.2em] text-ivory/30">0{i + 1}</span>
                    {n.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-6 text-[10px] uppercase tracking-[0.24em] text-gold/80">Members</div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {MEMBER_LINKS.map((m) => (
                  <Link key={m.href} href={m.href} className={clsx("flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[11px]", active(m.href) ? "border-gold/50 text-gold" : "border-white/10 text-ivory/70")}>
                    <Icon name={m.icon} size={18} />
                    {m.label}
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                {user ? (
                  <Link href={user.home} className="btn-gold flex-1">
                    My panel
                  </Link>
                ) : (
                  <>
                    <Link href="/sign-in" className="btn-ghost flex-1">
                      Sign in
                    </Link>
                    <Link href="/sign-up" className="btn-primary flex-1">
                      Join
                    </Link>
                  </>
                )}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: "grid" | "user" | "card"; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ivory/70 transition hover:bg-white/5 hover:text-ivory">
      <Icon name={icon} size={16} /> {label}
    </Link>
  );
}
