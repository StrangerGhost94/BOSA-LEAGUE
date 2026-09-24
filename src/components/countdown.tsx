"use client";

import { useEffect, useState } from "react";

export function Countdown({ to, className }: { to: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - (now ?? Date.now()));
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const parts: [number, string][] = [[d, "Days"], [h, "Hrs"], [m, "Min"], [s, "Sec"]];
  return (
    <div className={`flex gap-2 ${className ?? ""}`} suppressHydrationWarning>
      {parts.map(([v, l]) => (
        <div key={l} className="min-w-[58px] rounded-xl border border-white/10 bg-night-900/50 px-2 py-2 text-center">
          <div className="font-display text-2xl tabular-nums text-ivory" suppressHydrationWarning>
            {now === null ? "--" : String(v).padStart(2, "0")}
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-ivory/40">{l}</div>
        </div>
      ))}
    </div>
  );
}
