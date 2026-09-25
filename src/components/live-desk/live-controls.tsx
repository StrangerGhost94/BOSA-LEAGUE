"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Crest } from "@/components/ui";
import { addEventAction, deleteEventAction, setMatchStatusAction } from "@/app/actions/admin";
import { fmtDate, fmtTime, liveMinute } from "@/lib/format";
import type { ActionResult } from "@/components/form";

type Player = { id: string; name: string; number: number; suspended: boolean };
type Side = { id: string; name: string; short: string; color: string; crest: string; players: Player[] };
type Ev = { id: string; type: string; minute: number; teamId: string; player: string | null };
type Match = { id: string; round: string; status: string; minute: number | null; clockAt: string | null; homeScore: number | null; awayScore: number | null; kickoff: string };

type Sheet = { kind: "goal" | "yellow" | "red"; team: Side } | null;

const EV: Record<string, { icon: string; label: string }> = {
  GOAL: { icon: "⚽", label: "Goal" },
  PENALTY_GOAL: { icon: "⚽", label: "Penalty" },
  OWN_GOAL: { icon: "⚽", label: "Own goal" },
  PENALTY_MISS: { icon: "✕", label: "Penalty missed" },
  YELLOW: { icon: "🟨", label: "Yellow card" },
  SECOND_YELLOW: { icon: "🟥", label: "Second yellow" },
  RED: { icon: "🟥", label: "Red card" },
  SUB: { icon: "⇄", label: "Substitution" },
};

/**
 * The live reporter's whole job on one phone screen: start the match, tap GOAL for a team and pick the scorer,
 * give cards, call half-time and full time. Everything else (standings, alerts to members) happens by itself.
 */
export function LiveControls({ match: m, home, away, events }: { match: Match; home: Side; away: Side; events: Ev[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<ActionResult>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const minute = liveMinute({ status: m.status, minute: m.minute, clockAt: m.clockAt }) ?? 0;
  const live = m.status === "LIVE";
  const firstHalf = live && (m.minute ?? 0) <= 45;
  const done = m.status === "FULL_TIME";

  const run = (action: (p: ActionResult, fd: FormData) => Promise<ActionResult>, fields: Record<string, string | number | null | undefined>, after?: () => void) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) if (v != null && v !== "") fd.set(k, String(v));
    start(async () => {
      const r = await action(null, fd);
      setToast(r);
      if (r?.ok) {
        after?.();
        router.refresh();
      }
    });
  };
  const setStatus = (status: string, min?: number, ask?: string) => {
    if (ask && !window.confirm(ask)) return;
    run(setMatchStatusAction, { id: m.id, status, minute: min });
  };

  const statusLine =
    m.status === "SCHEDULED"
      ? `Not started · ${fmtDate(m.kickoff, { weekday: "short", day: "numeric", month: "short" })} ${fmtTime(m.kickoff)}`
      : m.status === "HALF_TIME"
        ? "Half-time"
        : live
          ? `Live · ${minute}'${firstHalf ? " · 1st half" : " · 2nd half"}`
          : done
            ? "Full time"
            : m.status.replace("_", " ").toLowerCase();

  return (
    <div className={pending ? "pointer-events-none opacity-70 transition" : "transition"}>
      <Link href="/live-desk" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gold">
        ‹ Matches
      </Link>

      {/* Scoreboard */}
      <div className={`rounded-3xl border p-5 ${live || m.status === "HALF_TIME" ? "border-crimson/50 bg-crimson/10" : "border-white/[0.08] bg-night-800/70"}`}>
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="text-ivory/50">{m.round}</span>
          <span className={`rounded-full px-2.5 py-1 font-semibold ${live ? "bg-crimson text-white" : m.status === "HALF_TIME" ? "bg-gold text-night-900" : "bg-white/10 text-ivory/70"}`}>{statusLine}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div className="min-w-0">
            <Crest team={home} size={52} className="mx-auto" />
            <div className="mt-2 truncate text-sm font-semibold">{home.name}</div>
          </div>
          <div className="font-display text-5xl tabular-nums">
            {m.homeScore ?? 0}
            <span className="mx-1 text-ivory/30">-</span>
            {m.awayScore ?? 0}
          </div>
          <div className="min-w-0">
            <Crest team={away} size={52} className="mx-auto" />
            <div className="mt-2 truncate text-sm font-semibold">{away.name}</div>
          </div>
        </div>
      </div>

      {/* Match stage */}
      <div className="mt-4 space-y-2">
        {m.status === "SCHEDULED" && (
          <button onClick={() => setStatus("LIVE", 1, `Kick off ${home.name} v ${away.name} now?`)} className="h-16 w-full rounded-2xl bg-crimson text-lg font-bold text-white active:scale-[0.99]">
            ▶ Kick off
          </button>
        )}
        {live && firstHalf && (
          <>
            <button onClick={() => setStatus("HALF_TIME", 45)} className="h-16 w-full rounded-2xl bg-gold text-lg font-bold text-night-900 active:scale-[0.99]">
              ⏸ Half-time
            </button>
            <button onClick={() => setStatus("FULL_TIME", undefined, "End the match now (no second half)?")} className="h-11 w-full rounded-xl border border-white/10 text-sm text-ivory/60">
              End match early
            </button>
          </>
        )}
        {m.status === "HALF_TIME" && (
          <button onClick={() => setStatus("LIVE", 46)} className="h-16 w-full rounded-2xl bg-crimson text-lg font-bold text-white active:scale-[0.99]">
            ▶ Start second half
          </button>
        )}
        {live && !firstHalf && (
          <button onClick={() => setStatus("FULL_TIME", undefined, `Full time: ${home.name} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${away.name}?`)} className="h-16 w-full rounded-2xl bg-emerald text-lg font-bold text-white active:scale-[0.99]">
            ⏹ Full time
          </button>
        )}
        {done && <p className="rounded-2xl border border-white/[0.08] px-4 py-3 text-center text-sm text-ivory/55">Match finished. You can still fix a goal or card below.</p>}
      </div>

      {/* Goals and cards */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[home, away].map((t) => (
          <div key={t.id} className="space-y-2">
            <button
              onClick={() => setSheet({ kind: "goal", team: t })}
              className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-night-800 active:scale-[0.98]"
              style={{ borderColor: t.color }}
            >
              <span className="text-2xl font-black tracking-wide">GOAL</span>
              <span className="max-w-full truncate px-2 text-xs text-ivory/60">{t.name}</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSheet({ kind: "yellow", team: t })} className="h-12 rounded-xl bg-[#f5c518] text-sm font-bold text-night-900 active:scale-[0.98]">
                Yellow
              </button>
              <button onClick={() => setSheet({ kind: "red", team: t })} className="h-12 rounded-xl bg-[#d7263d] text-sm font-bold text-white active:scale-[0.98]">
                Red
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-7">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/40">What happened</h2>
        {events.length === 0 && <p className="text-sm text-ivory/40">Nothing yet.</p>}
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-night-800/60">
          {events.map((e) => {
            const t = e.teamId === home.id ? home : away;
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-9 font-display text-lg tabular-nums text-gold">{e.minute}&apos;</span>
                <span className="text-lg">{EV[e.type]?.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{e.player ?? (e.type.includes("GOAL") ? "Scorer not set" : "Player not set")}</span>
                  <span className="block truncate text-xs text-ivory/45">
                    {EV[e.type]?.label} · {t.name}
                  </span>
                </span>
                <button
                  onClick={() => window.confirm(`Remove this ${EV[e.type]?.label.toLowerCase()}?`) && run(deleteEventAction, { eventId: e.id })}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-ivory/60 active:bg-white/10"
                >
                  Undo
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {sheet && <PlayerSheet sheet={sheet} other={sheet.team.id === home.id ? away : home} minute={Math.max(1, minute)} onClose={() => setSheet(null)} onPick={(fields) => run(addEventAction, { id: m.id, ...fields }, () => setSheet(null))} />}

      {toast?.message && (
        <div className="fixed inset-x-4 bottom-[calc(1rem+var(--safe-bottom))] z-[95] mx-auto max-w-md">
          <div className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-2xl ${toast.ok ? "bg-emerald text-white" : "bg-crimson text-white"}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}

/** Bottom sheet: pick who scored or who was booked. Big buttons, one tap. */
function PlayerSheet({ sheet, other, minute, onClose, onPick }: { sheet: NonNullable<Sheet>; other: Side; minute: number; onClose: () => void; onPick: (f: Record<string, string | number | null>) => void }) {
  const [min, setMin] = useState(String(minute));
  const [goalType, setGoalType] = useState<"GOAL" | "PENALTY_GOAL" | "OWN_GOAL">("GOAL");
  const [q, setQ] = useState("");
  const own = sheet.kind === "goal" && goalType === "OWN_GOAL";
  const pool = own ? other.players : sheet.team.players;
  const list = useMemo(() => pool.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.number) === q), [pool, q]);
  const type = sheet.kind === "goal" ? goalType : sheet.kind === "yellow" ? "YELLOW" : "RED";
  const title = sheet.kind === "goal" ? `Goal for ${sheet.team.name}` : `${sheet.kind === "yellow" ? "Yellow" : "Red"} card · ${sheet.team.name}`;
  const pick = (playerId: string | null) => onPick({ type, teamId: sheet.team.id, minute: Number(min) || minute, playerId });

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[88vh] w-full overflow-hidden rounded-t-3xl border-t border-white/10 bg-night-900 pb-[var(--safe-bottom)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h3 className="font-serif text-xl">{title}</h3>
          <button onClick={onClose} className="h-9 rounded-lg px-3 text-sm text-ivory/60 active:bg-white/10">
            Cancel
          </button>
        </div>
        <div className="space-y-3 px-5">
          <label className="flex items-center gap-3 text-sm text-ivory/60">
            Minute
            <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" className="input h-11 w-20 text-center text-lg" />
          </label>
          {sheet.kind === "goal" && (
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.05] p-1 text-sm">
              {(
                [
                  ["GOAL", "Normal"],
                  ["PENALTY_GOAL", "Penalty"],
                  ["OWN_GOAL", "Own goal"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} onClick={() => setGoalType(v)} className={`h-10 rounded-lg ${goalType === v ? "bg-gold font-semibold text-night-900" : "text-ivory/70"}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {own && <p className="text-xs text-ivory/50">Pick the {other.name} player who put it in their own net. The goal counts for {sheet.team.name}.</p>}
          {pool.length > 8 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a player (name or number)" className="input h-11" />}
        </div>
        <div className="mt-3 max-h-[46vh] overflow-y-auto px-5 pb-5">
          {!own && (
            <button onClick={() => pick(null)} className="mb-2 h-12 w-full rounded-xl border border-dashed border-white/20 text-sm text-ivory/70 active:bg-white/10">
              {sheet.kind === "goal" ? "Not sure who scored" : "Player not on the list"}
            </button>
          )}
          <div className="grid grid-cols-1 gap-2">
            {list.map((p) => (
              <button
                key={p.id}
                disabled={p.suspended}
                onClick={() => pick(p.id)}
                className="flex h-12 items-center gap-3 rounded-xl bg-white/[0.05] px-4 text-left active:bg-white/15 disabled:opacity-35"
              >
                <span className="w-7 font-display text-gold tabular-nums">{p.number || "–"}</span>
                <span className="truncate">{p.name}</span>
                {p.suspended && <span className="ml-auto text-xs text-crimson-400">Suspended</span>}
              </button>
            ))}
            {list.length === 0 && <p className="py-4 text-center text-sm text-ivory/40">{pool.length ? "No player matches that." : "No squad list yet for this club."}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
