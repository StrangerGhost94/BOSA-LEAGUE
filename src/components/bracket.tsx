"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import { Crest, CompetitionBadge } from "@/components/ui";

type BT = { id: string; name: string; crest: string; primaryColor: string; shortName: string } | null;
export type BracketMatch = {
  id: string;
  slot: number;
  home: BT;
  away: BT;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
  status: string;
  when: string;
  winnerId: string | null;
};

export function Bracket({ qf, sf, final, championId }: { qf: BracketMatch[]; sf: BracketMatch[]; final: BracketMatch | null; championId: string | null }) {
  const [hover, setHover] = useState<string | null>(null);
  const bySlot = (arr: BracketMatch[], n: number) => Array.from({ length: n }, (_, i) => arr.find((m) => m.slot === i + 1) ?? null);
  const Q = bySlot(qf, 4);
  const S = bySlot(sf, 2);
  const champion = final && championId ? (final.home?.id === championId ? final.home : final.away) : null;

  return (
    <div className="overflow-x-auto scrollbar-none pb-4">
      <div className="grid min-w-[980px] grid-cols-[1fr_1fr_1fr_220px] gap-10">
        <Column title="Quarter-finals" delay={0}>
          <Pair>
            <Tie m={Q[0]} hover={hover} setHover={setHover} />
            <Tie m={Q[1]} hover={hover} setHover={setHover} />
          </Pair>
          <Pair>
            <Tie m={Q[2]} hover={hover} setHover={setHover} />
            <Tie m={Q[3]} hover={hover} setHover={setHover} />
          </Pair>
        </Column>
        <Column title="Semi-finals" delay={0.25}>
          <Pair tall>
            <Tie m={S[0]} hover={hover} setHover={setHover} />
            <Tie m={S[1]} hover={hover} setHover={setHover} />
          </Pair>
        </Column>
        <Column title="Final" delay={0.5}>
          <div className="flex h-full items-center">
            <div className="w-full">
              <Tie m={final} hover={hover} setHover={setHover} big />
            </div>
          </div>
        </Column>
        <Column title="Champion" delay={0.75}>
          <div className="flex h-full items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="relative w-full overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/15 to-transparent p-6 text-center"
            >
              <div className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(214,182,118,0.39),rgba(214,182,118,0))]" />
              <div className="relative mx-auto w-fit">
                <CompetitionBadge type="CHAMPIONS" size={64} />
              </div>
              {champion ? (
                <>
                  <Crest team={champion} size={64} className="relative mx-auto mt-4" />
                  <div className="relative mt-3 font-serif text-2xl text-gold-300">{champion.name}</div>
                </>
              ) : (
                <>
                  <div className="relative mt-4 font-serif text-xl text-ivory/80">To be crowned</div>
                  <div className="relative mt-1 text-xs text-ivory/45">{final?.when ?? ""}</div>
                </>
              )}
            </motion.div>
          </div>
        </Column>
      </div>
    </div>
  );
}

function Column({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
    >
      <div className="eyebrow mb-5 text-center">{title}</div>
      <div className="flex min-h-[520px] flex-1 flex-col justify-around gap-6">{children}</div>
    </motion.div>
  );
}

function Pair({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div className={clsx("relative flex flex-col justify-around gap-6", tall ? "h-full" : "flex-1")}>
      {children}
      <motion.span
        aria-hidden
        className="absolute -right-5 top-1/4 bottom-1/4 w-5 rounded-r-lg border-y border-r border-gold/30"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
      <span aria-hidden className="absolute -right-10 top-1/2 h-px w-5 bg-gold/30" />
    </div>
  );
}

function Tie({ m, hover, setHover, big }: { m: BracketMatch | null; hover: string | null; setHover: (s: string | null) => void; big?: boolean }) {
  if (!m)
    return <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-ivory/35">To be decided</div>;
  const involved = !!hover && (m.home?.id === hover || m.away?.id === hover);
  const dim = !!hover && !involved;
  return (
    <Link
      href={`/matches/${m.id}`}
      className={clsx(
        "block overflow-hidden rounded-xl border bg-night-800/80 transition-all duration-300",
        involved ? "border-gold/70 shadow-[0_0_40px_-10px_rgba(214,182,118,.6)]" : "border-white/[0.08] hover:border-gold/30",
        dim && "opacity-40",
        big && "border-gold/30",
      )}
    >
      <Row team={m.home} score={m.homeScore} pens={m.homePens} win={m.winnerId != null && m.winnerId === m.home?.id} setHover={setHover} played={m.status === "FULL_TIME" || m.status === "LIVE"} />
      <div className="h-px bg-white/[0.06]" />
      <Row team={m.away} score={m.awayScore} pens={m.awayPens} win={m.winnerId != null && m.winnerId === m.away?.id} setHover={setHover} played={m.status === "FULL_TIME" || m.status === "LIVE"} />
      <div className="bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-ivory/40">{m.status === "FULL_TIME" ? "Full-time" : m.status === "LIVE" ? "Live" : m.when}</div>
    </Link>
  );
}

function Row({ team, score, pens, win, setHover, played }: { team: BT; score: number | null; pens: number | null; win: boolean; setHover: (s: string | null) => void; played: boolean }) {
  return (
    <div
      className={clsx("flex items-center gap-3 px-3 py-2.5", win && "bg-gold/[0.08]")}
      onMouseEnter={() => team && setHover(team.id)}
      onMouseLeave={() => setHover(null)}
    >
      <Crest team={team} size={26} />
      <span className={clsx("flex-1 truncate text-sm", win ? "font-semibold text-gold-300" : "text-ivory/80", !team && "text-ivory/35")}>{team?.name ?? "To be decided"}</span>
      {played && (
        <span className="flex items-center gap-1 font-display tabular-nums">
          {pens != null && <span className="text-[10px] text-ivory/45">({pens})</span>}
          <span className={win ? "text-gold-300" : ""}>{score}</span>
        </span>
      )}
    </div>
  );
}
