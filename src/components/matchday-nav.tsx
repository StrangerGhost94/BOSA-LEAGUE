"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui";

/** Matchday chips. The strip opens with the current matchday in the middle, not hidden at the edge. */
export function MatchdayNav({ base, current, total, played, param = "md", label = "MD" }: { base: string; current: number; total: number; played: number; param?: string; label?: string }) {
  const sep = base.includes("?") ? "&" : "?";
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>("[data-active]");
    if (!el || !active) return;
    el.scrollTo({ left: active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2, behavior: "instant" as ScrollBehavior });
  }, [current]);
  return (
    <div className="flex items-center gap-3">
      <Link
        aria-label="Previous matchday"
        href={`${base}${sep}${param}=${Math.max(1, current - 1)}#fixtures`}
        scroll={false}
        className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 transition hover:border-gold/40", current <= 1 && "pointer-events-none opacity-30")}
      >
        <Icon name="arrowLeft" size={16} />
      </Link>
      <div ref={strip} className="relative mask-fade-x flex flex-1 gap-2 overflow-x-auto scrollbar-none px-4 py-1">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          return (
            <Link
              key={n}
              data-active={n === current ? "" : undefined}
              href={`${base}${sep}${param}=${n}#fixtures`}
              scroll={false}
              className={clsx(
                "relative grid h-10 min-w-10 shrink-0 place-items-center rounded-full px-3 font-display text-sm tabular-nums transition",
                n === current ? "bg-gold text-night-900" : n <= played ? "border border-white/10 text-ivory/80 hover:border-gold/40" : "border border-dashed border-white/10 text-ivory/40 hover:border-gold/30",
              )}
            >
              {label}
              {n}
            </Link>
          );
        })}
      </div>
      <Link
        aria-label="Next matchday"
        href={`${base}${sep}${param}=${Math.min(total, current + 1)}#fixtures`}
        scroll={false}
        className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 transition hover:border-gold/40", current >= total && "pointer-events-none opacity-30")}
      >
        <Icon name="arrowRight" size={16} />
      </Link>
    </div>
  );
}
