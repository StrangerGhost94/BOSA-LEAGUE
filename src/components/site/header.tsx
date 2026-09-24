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

export function SiteHeader({ user, liveCount = 0 }: { user: HeaderUser; liveCount?: number }) {
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
          "fixed inset-x-0 top-0 z-50 pt-[var(--safe-top)] transition-all duration-500",
          scrolled ? "border-b border-white/[0.06] bg-night-900/90 backdrop-blur-md" : "bg-transparent",
        )}
      >
        {/* Status bar area: always solid, so app content never shows behind the time, signal and battery */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[var(--safe-top)] bg-night-900" />
        <div className="container-x relative flex h-[var(--header-h)] items-center gap-3 sm:gap-6">
          <Link href="/" className="group flex items-center gap-3" aria-label="BOSA League home">
            <BosaLogo size={36} className="transition-transform duration-500 group-hover:scale-105" />
            <span className="block whitespace-nowrap leading-none xl:hidden 2xl:block">
              <span className="block font-display text-[13px] font-semibold tracking-[0.1em] text-ivory min-[380px]:text-[15px] min-[380px]:tracking-[0.12em] sm:text-[17px]">BOSA LEAGUE</span>
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

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {liveCount > 0 && (
              <Link href="/live" className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-crimson/50 bg-crimson/15 px-2.5 py-1.5 text-xs font-semibold text-crimson-400 sm:gap-2 sm:px-3">
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
            {/* Phones and tablets: menu sits next to the account button, which stays at the far right */}
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 active:bg-white/5 xl:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="flex items-center gap-2 rounded-full border border-white/10 p-1 text-sm transition hover:border-gold/40 sm:pr-3 xl:pr-1 2xl:pr-3"
                  aria-label="Account menu"
                  aria-expanded={menu}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-sm font-semibold text-night-900">
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
                      className="glass absolute right-0 mt-3 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-night-900/95 p-2 shadow-2xl"
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
                {/* Phones: Sign in and Join side by side in one pill, right where the thumb is */}
                <div className="flex items-center overflow-hidden rounded-full border border-white/15 sm:hidden">
                  <Link href="/sign-in" className="flex min-h-[40px] items-center whitespace-nowrap px-2.5 text-xs font-semibold text-ivory/85 active:bg-white/5 min-[360px]:px-3">
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="flex min-h-[40px] items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-white min-[360px]:px-3.5"
                    style={{ background: "linear-gradient(135deg, #e04a74 0%, #cc2654 45%, #a91c44 100%)" }}
                  >
                    Join
                  </Link>
                </div>
                <Link href="/sign-in" className="btn-quiet btn-sm hidden sm:inline-flex">
                  Sign in
                </Link>
                <Magnetic className="hidden sm:inline-block">
                  <Link href="/sign-up" className="btn-primary btn-sm">
                    Join the League
                  </Link>
                </Magnetic>
              </>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-night-900 pb-[max(2rem,var(--safe-bottom))] pt-[var(--safe-top)] backdrop-blur-2xl xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(204,38,84,0.26),rgba(204,38,84,0))]" />
            <div className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(214,182,118,0.13),rgba(214,182,118,0))]" />
            <div className="container-x sticky top-0 z-10 flex h-[var(--header-h)] items-center gap-3 bg-night-900">
              <BosaLogo size={36} />
              <span className="font-display text-sm tracking-[0.14em]">BOSA LEAGUE</span>
              <button className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-white/10" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <motion.nav
              className="container-x relative mt-2 flex flex-col"
              initial="h"
              animate="s"
              variants={{ h: {}, s: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
            >
              <button
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event("bosa:install"));
                }}
                className="mb-2 mt-3 flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-left"
              >
                <BosaLogo size={32} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Get the BOSA app</span>
                  <span className="block text-xs text-ivory/55">Add it to your home screen</span>
                </span>
                <Icon name="download" size={18} className="text-gold" />
              </button>
              {NAV.map((n, i) => (
                <motion.div
                  key={n.href}
                  variants={{ h: reduce ? { opacity: 0 } : { opacity: 0, x: -30 }, s: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                >
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
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
