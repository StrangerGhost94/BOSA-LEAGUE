"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icon } from "@/components/ui";

const TABS = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/fixtures", label: "Fixtures", icon: "calendar" as const },
  { href: "/league", label: "Table", icon: "list" as const },
  { href: "/live", label: "Live", icon: "activity" as const },
  { href: "/members", label: "Members", icon: "card" as const },
];

/** Thumb-reach navigation for phones and tablets. Hidden on wide screens, where the full header menu shows. */
export function MobileTabBar({ liveCount = 0 }: { liveCount?: number }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-night-900/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={clsx("relative flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition", active(t.href) ? "text-gold" : "text-ivory/55")}
          >
            {active(t.href) && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-gold" />}
            <span className="relative">
              <Icon name={t.icon} size={20} />
              {t.href === "/live" && liveCount > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 animate-pulseDot rounded-full bg-crimson-400" />}
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
