"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import { CompetitionBadge, Crest, Arrow } from "@/components/ui";

type Row = { pos: number; name: string; crest: string; primaryColor: string; pts: number; played: number; gd: number };
type Fx = { id: string; home: { name: string; crest: string; primaryColor: string } | null; away: { name: string; crest: string; primaryColor: string } | null; when: string; round: string; score?: string };
export type CompPreview = {
  slug: string;
  href: string;
  name: string;
  type: string;
  tagline: string;
  season: string;
  tableTitle: string;
  rows: Row[];
  fixtures: Fx[];
  stat: { label: string; value: string }[];
};

const GRADIENTS: Record<string, string> = {
  LEAGUE: "from-crimson-600/60 via-night-700 to-night-800",
  CHAMPIONS: "from-gold-700/60 via-night-700 to-night-800",
  SUPER: "from-emerald-700/70 via-night-700 to-night-800",
};

export function CompetitionSwitcher({ items }: { items: CompPreview[] }) {
  const [active, setActive] = useState(0);
  const c = items[active];
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3" role="tablist">
        {items.map((it, i) => (
          <button
            key={it.slug}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={clsx(
              "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500",
              i === active ? "border-gold/40" : "border-white/[0.07] hover:border-white/20",
            )}
          >
            <div className={clsx("absolute inset-0 animate-gradient bg-gradient-to-br bg-[length:200%_200%] transition-opacity duration-700", GRADIENTS[it.type], i === active ? "opacity-100" : "opacity-40 group-hover:opacity-70")} />
            <div className="relative flex items-center gap-4">
              <CompetitionBadge type={it.type} size={48} />
              <div>
                <div className="font-serif text-xl">{it.name}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-ivory/55">{it.season}</div>
              </div>
            </div>
            {i === active && <motion.div layoutId="comp-active" className="absolute inset-x-5 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={c.slug}
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass mt-4 grid gap-8 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr]"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="eyebrow">{c.tableTitle}</div>
              <Link href={c.href} className="group flex items-center gap-1.5 text-xs font-semibold text-ivory/60 hover:text-gold">
                Full table <Arrow className="transition group-hover:translate-x-1" />
              </Link>
            </div>
            <ul className="mt-5 space-y-1.5">
              {c.rows.map((r, i) => (
                <motion.li
                  key={r.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.04]"
                >
                  <span className={clsx("w-5 font-display text-sm", r.pos === 1 ? "text-gold" : "text-ivory/50")}>{r.pos}</span>
                  <Crest team={{ name: r.name, crest: r.crest, primaryColor: r.primaryColor }} size={28} />
                  <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
                  <span className="w-10 text-right text-xs tabular-nums text-ivory/45">{r.played} P</span>
                  <span className="w-12 text-right text-xs tabular-nums text-ivory/45">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
                  <span className="w-10 rounded-md bg-white/[0.06] py-0.5 text-center font-display tabular-nums">{r.pts}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col">
            <p className="font-serif text-2xl leading-snug text-ivory/90">{c.tagline}</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {c.stat.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.07] p-3">
                  <div className="font-display text-2xl text-gold">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-ivory/45">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="eyebrow mb-3 mt-8">Next up</div>
            <ul className="space-y-2">
              {c.fixtures.map((f) => (
                <li key={f.id}>
                  <Link href={`/matches/${f.id}`} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2.5 text-sm transition hover:border-gold/30">
                    <span className="w-24 shrink-0 text-[11px] uppercase tracking-[0.12em] text-gold">{f.when}</span>
                    <span className="flex flex-1 items-center justify-end gap-2 truncate text-right">
                      <span className="truncate">{f.home?.name ?? "TBD"}</span>
                      <Crest team={f.home} size={22} />
                    </span>
                    <span className="text-ivory/35">{f.score ?? "v"}</span>
                    <span className="flex flex-1 items-center gap-2 truncate">
                      <Crest team={f.away} size={22} />
                      <span className="truncate">{f.away?.name ?? "TBD"}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {c.fixtures.length === 0 && <li className="text-sm text-ivory/45">No upcoming fixtures scheduled.</li>}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
