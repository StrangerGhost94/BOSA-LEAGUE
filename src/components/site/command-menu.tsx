"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";

type Result = { type: string; label: string; sub?: string; href: string; crest?: string };

const QUICK: Result[] = [
  { type: "Page", label: "BOSA League table", href: "/league" },
  { type: "Page", label: "Champions League bracket", href: "/champions-league" },
  { type: "Page", label: "Super Cup", href: "/super-cup" },
  { type: "Page", label: "Fixtures and results", href: "/fixtures" },
  { type: "Page", label: "Newsroom", href: "/news" },
  { type: "Page", label: "Become a member", href: "/membership" },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>(QUICK);
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("bosa:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("bosa:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQ("");
      setResults(QUICK);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setResults(QUICK);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = (await r.json()) as { results: Result[] };
        setResults(j.results);
        setIdx(0);
      } catch {}
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r?: Result) => {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-night-900/70 px-4 pt-[12vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Search BOSA League"
            className="glass w-full max-w-xl overflow-hidden rounded-2xl shadow-[0_40px_120px_-20px_rgba(0,0,0,.8)]"
            initial={{ y: -20, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-5">
              <Icon name="search" className="text-gold" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIdx((i) => Math.min(results.length - 1, i + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIdx((i) => Math.max(0, i - 1));
                  }
                  if (e.key === "Enter") go(results[idx]);
                }}
                placeholder="Search teams, players, news..."
                className="h-14 w-full bg-transparent text-[15px] text-ivory outline-none placeholder:text-ivory/35"
              />
              <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-ivory/40">ESC</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-ivory/40">Nothing found for that search.</li>}
              {results.map((r, i) => (
                <li key={r.href + i}>
                  <button
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === idx ? "bg-white/[0.07]" : ""}`}
                  >
                    {r.crest ? (
                      <img src={r.crest} alt="" className="h-8 w-8 rounded-full bg-white object-cover" />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/20 text-gold">
                        <Icon name="arrowRight" size={14} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ivory">{r.label}</span>
                      {r.sub && <span className="block truncate text-xs text-ivory/45">{r.sub}</span>}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-ivory/35">{r.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
