"use client";

import { useState, type ReactNode } from "react";
import { downloadFromUrl } from "@/lib/save-file";

/** A download that stays inside the app (no new page), with a short confirmation. */
export function DownloadButton({ href, children, className = "btn-ghost btn-sm" }: { href: string; children: ReactNode; className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={className}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            const r = await downloadFromUrl(href);
            setState("done");
            setMsg(r === "cancelled" ? "" : "Saved");
          } catch (e) {
            setState("error");
            setMsg((e as Error).message);
          }
          setTimeout(() => setState("idle"), 2500);
        }}
      >
        {state === "busy" && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </button>
      {state !== "idle" && state !== "busy" && msg && (
        <span className={`absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] ${state === "error" ? "bg-crimson text-white" : "bg-emerald text-white"}`}>{msg}</span>
      )}
    </span>
  );
}

/** Card-style version used on Reports & exports. */
export function DownloadCard({ href, title, body, icon }: { href: string; title: string; body: string; icon: ReactNode }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        try {
          await downloadFromUrl(href);
          setState("done");
        } catch (e) {
          setErr((e as Error).message);
          setState("error");
        }
        setTimeout(() => setState("idle"), 3000);
      }}
      className="panel group flex w-full items-start gap-4 p-5 text-left transition hover:border-gold/30 disabled:opacity-70"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
        {state === "busy" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      </span>
      <span>
        <span className="block font-semibold group-hover:text-gold">{title}</span>
        <span className="text-sm text-ivory/50">{state === "done" ? "Saved." : state === "error" ? err : body}</span>
      </span>
    </button>
  );
}
