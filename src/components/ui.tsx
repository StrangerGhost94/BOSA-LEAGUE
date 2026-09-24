import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { STATUS_LABEL } from "@/lib/format";

type CrestTeam = { name: string; crest: string; primaryColor?: string | null } | null | undefined;

export function Crest({ team, size = 40, className, ring = true }: { team: CrestTeam; size?: number; className?: string; ring?: boolean }) {
  if (!team)
    return (
      <span
        className={clsx("inline-grid place-items-center rounded-full border border-dashed border-ivory/20 text-[10px] font-semibold text-ivory/40", className)}
        style={{ width: size, height: size }}
      >
        TBD
      </span>
    );
  return (
    <span
      className={clsx("relative inline-grid shrink-0 place-items-center rounded-full bg-white", ring && "ring-1 ring-black/5", className)}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 ${Math.max(1, size / 28)}px ${team.primaryColor ?? "#D6B676"}55, 0 ${size / 6}px ${size / 2.5}px -${size / 6}px rgba(0,0,0,.6)` : undefined,
      }}
    >
      <img src={team.crest} alt={`${team.name} crest`} width={size} height={size} className="h-full w-full rounded-full object-cover" loading="lazy" />
    </span>
  );
}

export function BosaLogo({ size = 44, className }: { size?: number; className?: string }) {
  return <img src="/crests/bosa-logo.png" alt="BOSA League" width={size} height={size * 1.086} style={{ width: size, height: "auto" }} className={className} />;
}

export function FormPills({ form, size = "md" }: { form: ("W" | "D" | "L")[]; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";
  return (
    <span className="inline-flex items-center gap-1">
      {form.map((f, i) => (
        <span
          key={i}
          title={f === "W" ? "Win" : f === "D" ? "Draw" : "Loss"}
          className={clsx(
            "form-pill grid place-items-center rounded-full font-bold",
            dim,
            f === "W" && "bg-emerald text-white",
            f === "D" && "bg-ivory/15 text-ivory",
            f === "L" && "bg-crimson/85 text-white",
          )}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {f}
        </span>
      ))}
      {form.length === 0 && <span className="text-xs text-ivory/30">No matches</span>}
    </span>
  );
}

export function StatusBadge({ status, minute }: { status: string; minute?: number | null }) {
  if (status === "LIVE" || status === "HALF_TIME")
    return (
      <span className="chip border-crimson/50 bg-crimson/15 text-crimson-400">
        <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-crimson-400" />
        {status === "LIVE" ? `Live${minute ? ` ${minute}'` : ""}` : "Half-time"}
      </span>
    );
  if (status === "FULL_TIME") return <span className="chip text-ivory/60">Full-time</span>;
  if (status === "POSTPONED") return <span className="chip border-gold/40 text-gold">Postponed</span>;
  if (status === "CANCELLED") return <span className="chip border-crimson/30 text-crimson-400">Cancelled</span>;
  return <span className="chip text-ivory/60">{STATUS_LABEL[status] ?? status}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
  light,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: { href: string; label: string };
  className?: string;
  light?: boolean;
}) {
  return (
    <div className={clsx("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <div className={clsx("eyebrow mb-3", light && "text-gold-700")}>{eyebrow}</div>}
        <h2 className={clsx("headline text-3xl sm:text-4xl md:text-5xl", light ? "text-night-800" : "text-ivory")}>{title}</h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className={clsx(
            "group inline-flex items-center gap-2 text-sm font-semibold",
            light ? "text-night-700 hover:text-crimson" : "text-ivory/70 hover:text-gold",
          )}
        >
          {action.label}
          <Arrow className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Icon({ name, className, size = 18 }: { name: keyof typeof ICONS; className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export const ICONS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h10" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10l4-3Z" /><path d="M12 7V3M16 10l4-1M14.5 14.5 17 18M9.5 14.5 7 18M8 10 4 9" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  news: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></>,
  whistle: <><circle cx="9" cy="14" r="5" /><path d="M13 11 21 7v4l-6 2" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  check: <><path d="m5 12 5 5L20 7" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14ZM20 17v4H6.5" /></>,
  bracket: <><path d="M3 5h5v4h4M3 15h5v-6M12 9h4v6h5M3 19h5v-4M12 15h4" /></>,
  flag: <><path d="M5 21V4M5 4h12l-2 4 2 4H5" /></>,
  bandage: <><rect x="2" y="8" width="20" height="8" rx="4" transform="rotate(-45 12 12)" /><path d="M10 10h.01M14 14h.01M14 10h.01M10 14h.01" /></>,
  arrowLeft: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  home: <><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
};

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-gold/20 px-6 py-14 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(214,182,118,0.07),transparent_60%)]" />
      <div className="relative mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-gold/25 text-gold">
        <Icon name="sparkle" />
      </div>
      <h3 className="relative font-serif text-2xl text-ivory">{title}</h3>
      {body && <p className="relative mx-auto mt-2 max-w-md text-sm text-ivory/55">{body}</p>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function StatTile({ label, children, hint, accent = "gold" }: { label: string; children: ReactNode; hint?: string; accent?: "gold" | "crimson" | "emerald" }) {
  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div
        className={clsx(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-60",
          accent === "gold" && "bg-gold",
          accent === "crimson" && "bg-crimson",
          accent === "emerald" && "bg-emerald",
        )}
      />
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ivory/45">{label}</div>
      <div className="mt-3 font-display text-4xl font-semibold text-ivory sm:text-5xl">{children}</div>
      {hint && <div className="mt-2 text-xs text-ivory/45">{hint}</div>}
    </div>
  );
}

export function CompetitionBadge({ type, size = 56 }: { type: "LEAGUE" | "CHAMPIONS" | "SUPER" | string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 64 64" };
  if (type === "CHAMPIONS")
    return (
      <svg {...common} aria-hidden>
        <defs>
          <linearGradient id="cg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#EEDDB4" />
            <stop offset="1" stopColor="#8C6E3E" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="#0A0F1E" stroke="url(#cg)" strokeWidth="1.5" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          return <path key={i} d="M0-4 1.2-1.2 4-1.2 1.8.6 2.6 3.4 0 1.8-2.6 3.4-1.8.6-4-1.2-1.2-1.2Z" fill="url(#cg)" transform={`translate(${32 + Math.cos(a) * 19} ${32 + Math.sin(a) * 19})`} />;
        })}
        <circle cx="32" cy="32" r="9" fill="none" stroke="url(#cg)" strokeWidth="1.2" />
        <path d="M32 23v18M23 32h18" stroke="url(#cg)" strokeWidth=".8" />
      </svg>
    );
  if (type === "SUPER")
    return (
      <svg {...common} aria-hidden>
        <defs>
          <linearGradient id="sg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#2DB38A" />
            <stop offset="1" stopColor="#135C47" />
          </linearGradient>
        </defs>
        <path d="M32 3 57 12v18c0 16-11 26-25 31C18 56 7 46 7 30V12L32 3Z" fill="#0A0F1E" stroke="url(#sg)" strokeWidth="1.6" />
        <path d="M32 14 36 25h11l-9 7 3.5 11L32 36l-9.5 7L26 32l-9-7h11L32 14Z" fill="none" stroke="#D6B676" strokeWidth="1.3" />
        <path d="M20 50h24" stroke="url(#sg)" strokeWidth="1.2" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#E04A74" />
          <stop offset="1" stopColor="#6E1230" />
        </linearGradient>
      </defs>
      <path d="M32 3 56 13v17c0 15-10 25-24 31C18 55 8 45 8 30V13L32 3Z" fill="url(#lg)" />
      <path d="M32 8 51 16v14c0 12-8 20-19 25-11-5-19-13-19-25V16L32 8Z" fill="none" stroke="#EEDDB4" strokeOpacity=".6" strokeWidth="1" />
      <text x="32" y="36" textAnchor="middle" fontFamily="var(--font-display)" fontSize="13" fontWeight="700" fill="#F6F1E7" letterSpacing="1">BOSA</text>
      <path d="M26 44l2 1.5L30 44l-.8 2.3 2 1.5h-2.4L28 50l-.8-2.2h-2.4l2-1.5L26 44Zm8 0 2 1.5 2-1.5-.8 2.3 2 1.5h-2.4L36 50l-.8-2.2h-2.4l2-1.5L34 44Z" fill="#EEDDB4" />
    </svg>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("panel p-5 sm:p-6", className)}>{children}</div>;
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "gold" | "crimson" | "emerald" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
        tone === "default" && "bg-white/[0.06] text-ivory/70",
        tone === "gold" && "bg-gold/15 text-gold",
        tone === "crimson" && "bg-crimson/15 text-crimson-400",
        tone === "emerald" && "bg-emerald/15 text-emerald-400",
      )}
    >
      {children}
    </span>
  );
}
