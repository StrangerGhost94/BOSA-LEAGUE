import Link from "next/link";
import clsx from "clsx";
import { StadiumBackdrop } from "@/components/site/stadium";
import { CountUp, FadeIn, RevealText, Stagger, StaggerItem } from "@/components/motion";
import { CompetitionBadge, Crest, Icon } from "@/components/ui";
import type { PlayerStat, TableRow } from "@/lib/data";

export function CompetitionHero({
  type,
  name,
  season,
  tagline,
  description,
  stats,
}: {
  type: string;
  name: string;
  season: string;
  tagline?: string | null;
  description?: string | null;
  stats: { label: string; value: number }[];
}) {
  return (
    <section className="relative overflow-hidden pb-16 pt-36">
      <StadiumBackdrop intensity={type === "CHAMPIONS" ? 1.2 : 1} />
      {type === "CHAMPIONS" && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_20%,rgba(214,182,118,.18),transparent)]" />}
      {type === "SUPER" && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_20%,rgba(30,140,107,.22),transparent)]" />}
      <div className="container-x relative">
        <FadeIn className="flex items-center gap-4">
          <CompetitionBadge type={type} size={64} />
          <div>
            <div className="eyebrow">{season}</div>
            <div className="mt-1 text-sm text-ivory/55">{tagline}</div>
          </div>
        </FadeIn>
        <h1 className="headline mt-8 text-6xl sm:text-7xl lg:text-[104px]">
          <RevealText text={name} />
        </h1>
        {description && (
          <FadeIn delay={0.3}>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ivory/60 sm:text-lg">{description}</p>
          </FadeIn>
        )}
        <FadeIn delay={0.45}>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-night-900/80 px-5 py-5 backdrop-blur">
                <CountUp value={s.value} className="gold-text font-display text-4xl" />
                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-ivory/45">{s.label}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  return (
    <div className="sticky top-[68px] z-30 border-y border-white/[0.06] bg-night-900/80 backdrop-blur-xl lg:top-[76px]">
      <div className="container-x flex gap-6 overflow-x-auto scrollbar-none">
        {items.map((i) => (
          <a key={i.href} href={i.href} className="whitespace-nowrap py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory/55 transition hover:text-gold">
            {i.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function MatchdayNav({ base, current, total, played, param = "md", label = "MD" }: { base: string; current: number; total: number; played: number; param?: string; label?: string }) {
  const sep = base.includes("?") ? "&" : "?";
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
      <div className="mask-fade-x flex flex-1 gap-2 overflow-x-auto scrollbar-none px-4 py-1">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          return (
            <Link
              key={n}
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

export function LeaderBoard({ title, players, stat, unit }: { title: string; players: PlayerStat[]; stat: keyof PlayerStat; unit: string }) {
  const max = Math.max(1, ...players.map((p) => Number(p[stat])));
  return (
    <div className="panel p-6">
      <div className="eyebrow mb-5">{title}</div>
      {players.length === 0 && <div className="py-6 text-sm text-ivory/40">No data yet.</div>}
      <Stagger as="ol" className="space-y-4">
        {players.map((p, i) => (
          <StaggerItem as="li" key={p.id}>
            <Link href={`/players/${p.id}`} className="group flex items-center gap-3">
              <span className={clsx("w-5 font-display", i === 0 ? "text-gold" : "text-ivory/40")}>{i + 1}</span>
              <img src={p.crest} alt="" className="h-8 w-8 rounded-full bg-white" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold group-hover:text-gold">
                  {p.firstName} {p.lastName}
                </span>
                <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                  <span className="bar-grow block h-full rounded-full bg-gradient-to-r from-crimson to-gold" style={{ width: `${(Number(p[stat]) / max) * 100}%`, animationDelay: `${i * 100}ms` }} />
                </span>
              </span>
              <span className="w-10 text-right">
                <span className="font-display text-2xl">{String(p[stat])}</span>
                <span className="sr-only"> {unit}</span>
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function TeamGoalsChart({ rows }: { rows: TableRow[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.goalsFor, r.goalsAgainst)));
  const sorted = [...rows].sort((a, b) => b.goalsFor - a.goalsFor || a.goalsAgainst - b.goalsAgainst);
  return (
    <div className="panel p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="eyebrow">Goals scored and conceded</div>
        <div className="flex gap-4 text-[11px] text-ivory/55">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> Scored</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-crimson" /> Conceded</span>
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((r, i) => (
          <Link key={r.teamId} href={`/teams/${r.team.slug}`} className="group grid grid-cols-[140px_1fr_1fr] items-center gap-3 sm:grid-cols-[180px_1fr_1fr]">
            <span className="flex min-w-0 items-center gap-2">
              <Crest team={r.team} size={24} />
              <span className="truncate text-sm group-hover:text-gold">{r.team.name}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <span className="bar-grow block h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300" style={{ width: `${(r.goalsFor / max) * 100}%`, animationDelay: `${i * 50}ms` }} />
              </span>
              <span className="w-6 text-right font-display text-sm tabular-nums">{r.goalsFor}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <span className="bar-grow block h-full rounded-full bg-gradient-to-r from-crimson-800 to-crimson-400" style={{ width: `${(r.goalsAgainst / max) * 100}%`, animationDelay: `${i * 50 + 200}ms` }} />
              </span>
              <span className="w-6 text-right font-display text-sm tabular-nums">{r.goalsAgainst}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HonoursList({ honours, teams }: { honours: { id: string; seasonName: string; year: number; champion: string; runnerUp: string | null; topScorer: string | null; note: string | null }[]; teams: { name: string; crest: string; primaryColor: string }[] }) {
  if (!honours.length)
    return (
      <div className="rounded-2xl border border-dashed border-gold/20 px-6 py-10 text-center text-sm text-ivory/50">
        The roll of honour will appear here once past champions are added by the League office.
      </div>
    );
  return (
    <Stagger className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07]">
      {honours.map((h) => {
        const t = teams.find((x) => x.name === h.champion);
        return (
          <StaggerItem key={h.id} className="group grid items-center gap-4 bg-night-800/50 p-5 transition hover:bg-night-700/60 sm:grid-cols-[100px_1fr_1fr_1.2fr]">
            <span className="font-display text-4xl text-ivory/20 transition group-hover:text-gold/60">{h.year}</span>
            <span className="flex items-center gap-3">
              {t && <Crest team={t} size={44} />}
              <span>
                <span className="block text-[10px] uppercase tracking-[0.2em] text-gold">{h.seasonName} champion</span>
                <span className="font-serif text-2xl">{h.champion}</span>
              </span>
            </span>
            <span className="text-sm text-ivory/55">{h.runnerUp ? `Runner-up: ${h.runnerUp}` : ""}</span>
            <span className="text-sm text-ivory/55">
              {h.topScorer && <>Top scorer: {h.topScorer}</>}
              {h.note && <span className="block text-xs text-ivory/40">{h.note}</span>}
            </span>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
