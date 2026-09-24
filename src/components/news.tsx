import Link from "next/link";
import clsx from "clsx";
import { CATEGORY_LABEL, timeAgo } from "@/lib/format";
import { CompetitionBadge, Icon } from "@/components/ui";

type A = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: Date;
  readMinutes: number;
  membersOnly: boolean;
  publicFrom?: Date | null;
  team?: { crest: string; primaryColor: string; secondaryColor: string; name: string } | null;
  competition?: { type: string; name: string } | null;
};

const COMP_BG: Record<string, [string, string]> = {
  LEAGUE: ["#A91C44", "#1B2033"],
  CHAMPIONS: ["#8C6E3E", "#0A0F1E"],
  SUPER: ["#135C47", "#0A0F1E"],
};

export function NewsCover({ a, className, big, chip = true }: { a: A; className?: string; big?: boolean; chip?: boolean }) {
  const [c1, c2] = a.team ? [a.team.primaryColor, "#060913"] : COMP_BG[a.competition?.type ?? ""] ?? ["#1B2033", "#060913"];
  return (
    <div className={clsx("relative overflow-hidden", className)} style={{ background: `radial-gradient(120% 90% at 20% 10%, ${c1} 0%, ${c2} 70%)` }}>
      <div className="absolute inset-0 opacity-50 mix-blend-overlay pitch-lines" />
      <div className="absolute -bottom-10 -right-10 opacity-90 transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-hover:-rotate-3">
        {a.team ? (
          <img src={a.team.crest} alt="" className={clsx("rounded-full bg-white/95 object-cover shadow-2xl", big ? "h-72 w-72" : "h-44 w-44")} />
        ) : a.competition ? (
          <CompetitionBadge type={a.competition.type} size={big ? 280 : 170} />
        ) : (
          <img src="/crests/bosa-logo.png" alt="" className={clsx("object-contain drop-shadow-2xl", big ? "h-72" : "h-44")} />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-night-900/90 via-night-900/10 to-transparent" />
      {chip && <div className="absolute left-5 top-5 flex gap-2">
        <span className="rounded-full bg-night-900/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold backdrop-blur">{CATEGORY_LABEL[a.category]}</span>
        {!a.membersOnly && a.publicFrom && a.publicFrom.getTime() > Date.now() && (
          <span className="flex items-center gap-1 rounded-full bg-gold/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-night-900">
            <Icon name="lock" size={11} /> Members first
          </span>
        )}
        {a.membersOnly && (
          <span className="flex items-center gap-1 rounded-full bg-crimson/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            <Icon name="lock" size={11} /> Members
          </span>
        )}
      </div>}
    </div>
  );
}

export function NewsCard({ a, variant = "standard" }: { a: A; variant?: "feature" | "standard" | "compact" | "ivory" }) {
  if (variant === "compact")
    return (
      <Link href={`/news/${a.slug}`} className="group flex gap-4 border-b border-white/[0.06] py-5 last:border-0">
        <NewsCover a={a} chip={false} className="h-20 w-24 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">{CATEGORY_LABEL[a.category]}</div>
          <h3 className="mt-1 line-clamp-2 font-serif text-lg leading-snug text-ivory transition group-hover:text-gold">{a.title}</h3>
          <div className="mt-1 text-xs text-ivory/40">{timeAgo(a.publishedAt)}</div>
        </div>
      </Link>
    );
  if (variant === "feature")
    return (
      <Link href={`/news/${a.slug}`} className="group relative block overflow-hidden rounded-3xl border border-white/[0.07]">
        <NewsCover a={a} big className="aspect-[4/3] w-full sm:aspect-[16/10]" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <h3 className="headline max-w-2xl text-3xl text-ivory transition group-hover:text-gold-300 sm:text-4xl lg:text-5xl">{a.title}</h3>
          <p className="mt-4 line-clamp-2 max-w-xl text-sm text-ivory/70 sm:text-base">{a.excerpt}</p>
          <div className="mt-5 flex items-center gap-3 text-xs text-ivory/50">
            <span>{timeAgo(a.publishedAt)}</span>
            <span className="h-1 w-1 rounded-full bg-gold/60" />
            <span>{a.readMinutes} min read</span>
          </div>
        </div>
      </Link>
    );
  const light = variant === "ivory";
  return (
    <Link
      href={`/news/${a.slug}`}
      className={clsx(
        "group block overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-1",
        light ? "border-night-800/10 bg-ivory text-night-800 hover:shadow-[0_30px_60px_-30px_rgba(6,9,19,.5)]" : "border-white/[0.07] bg-night-800/60 hover:border-gold/25",
      )}
    >
      <NewsCover a={a} className="aspect-[16/10] w-full" />
      <div className="p-5">
        <h3 className={clsx("line-clamp-2 font-serif text-xl leading-snug transition", light ? "group-hover:text-crimson" : "text-ivory group-hover:text-gold")}>{a.title}</h3>
        <p className={clsx("mt-2 line-clamp-2 text-sm", light ? "text-night-600/75" : "text-ivory/55")}>{a.excerpt}</p>
        <div className={clsx("mt-4 flex items-center gap-2 text-xs", light ? "text-night-600/55" : "text-ivory/40")}>
          <span>{timeAgo(a.publishedAt)}</span>
          <span className="h-1 w-1 rounded-full bg-gold/60" />
          <span>{a.readMinutes} min read</span>
        </div>
      </div>
    </Link>
  );
}
