"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Poster, POSTER_H, POSTER_W, type PosterSpec } from "./poster";
import { saveBlob } from "@/lib/save-file";

export type MatchdayOption = { key: string; label: string; fixtures: PosterSpec; results: PosterSpec | null };

type Kind = "table" | "fixtures" | "results" | "scorers";
const KINDS: { v: Kind; label: string }[] = [
  { v: "table", label: "Table" },
  { v: "fixtures", label: "Fixtures" },
  { v: "results", label: "Results" },
  { v: "scorers", label: "Top scorers" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Match-day graphics for social media and WhatsApp, drawn from live data.
 * Saving never leaves the app: the file is made here, then shared or downloaded in place.
 */
export function PosterStudio({ table, scorers, matchdays, defaultKey }: { table: PosterSpec; scorers: PosterSpec; matchdays: MatchdayOption[]; defaultKey?: string }) {
  const [kind, setKind] = useState<Kind>("table");
  const [mdKey, setMdKey] = useState(defaultKey ?? matchdays[0]?.key ?? "");
  const [busy, setBusy] = useState<null | "png" | "pdf" | "share">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [scale, setScale] = useState(0.3);
  const box = useRef<HTMLDivElement>(null);
  const node = useRef<HTMLDivElement>(null);

  const md = matchdays.find((m) => m.key === mdKey) ?? matchdays[0];
  const spec: PosterSpec | null = kind === "table" ? table : kind === "scorers" ? scorers : kind === "fixtures" ? md?.fixtures ?? null : md?.results ?? null;
  const mdChoices = kind === "results" ? matchdays.filter((m) => m.results) : matchdays;
  useEffect(() => {
    // Results open on the most recent played matchday
    if (kind === "results" && md && !md.results && mdChoices.length) setMdKey(mdChoices[mdChoices.length - 1].key);
  }, [kind, md, mdChoices]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / POSTER_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fileBase = useMemo(() => {
    if (!spec) return "bosa";
    if (spec.kind === "table") return `bosa-league-table-${slug(spec.season)}`;
    if (spec.kind === "scorers") return `bosa-top-scorers-${slug(spec.season)}`;
    return `bosa-${slug(spec.title)}-${spec.kind}`;
  }, [spec]);

  const renderPng = useCallback(async () => {
    const { toBlob, toPng } = await import("html-to-image");
    await document.fonts.ready;
    const el = node.current!;
    // First pass loads fonts and crests so the saved file matches the preview
    await toPng(el, { pixelRatio: 1, cacheBust: false }).catch(() => null);
    const blob = await toBlob(el, { pixelRatio: 1.5, cacheBust: false, width: POSTER_W, height: POSTER_H });
    if (!blob) throw new Error("render");
    return blob;
  }, []);

  const run = async (what: "png" | "pdf" | "share") => {
    setBusy(what);
    setMsg(null);
    try {
      const png = await renderPng();
      let blob: Blob = png;
      let name = `${fileBase}.png`;
      if (what === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [POSTER_W, POSTER_H], hotfixes: ["px_scaling"], compress: true });
        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(png);
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, POSTER_W, POSTER_H, undefined, "FAST");
        blob = pdf.output("blob");
        name = `${fileBase}.pdf`;
      }
      const r = await saveBlob(blob, name, { share: what === "share", title: "BOSA League" });
      if (r !== "cancelled") setMsg({ ok: true, text: r === "shared" ? "Ready. Pick where to save or send it." : `Saved as ${name}` });
    } catch {
      setMsg({ ok: false, text: "Could not create the file. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
          {KINDS.map((k) => (
            <button key={k.v} type="button" onClick={() => setKind(k.v)} className={clsx("h-10 rounded-lg text-sm transition", kind === k.v ? "bg-gold font-semibold text-night-900" : "text-ivory/65 hover:text-ivory")}>
              {k.label}
            </button>
          ))}
        </div>

        {(kind === "fixtures" || kind === "results") && (
          <label className="block">
            <span className="label">{kind === "fixtures" ? "Which matchday" : "Which played matchday"}</span>
            <select className="input" value={mdKey} onChange={(e) => setMdKey(e.target.value)}>
              {mdChoices.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            {kind === "results" && mdChoices.length === 0 && <span className="mt-2 block text-xs text-ivory/45">No results yet this season.</span>}
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!spec || !!busy} onClick={() => run("png")} className="btn-gold">
            {busy === "png" ? "Making image..." : "Save image"}
          </button>
          <button type="button" disabled={!spec || !!busy} onClick={() => run("pdf")} className="btn-ghost">
            {busy === "pdf" ? "Making PDF..." : "Save PDF"}
          </button>
          <button type="button" disabled={!spec || !!busy} onClick={() => run("share")} className="btn-ghost col-span-2">
            {busy === "share" ? "Preparing..." : "Share (WhatsApp, Instagram...)"}
          </button>
        </div>
        {msg && <p className={clsx("rounded-xl px-4 py-3 text-sm", msg.ok ? "bg-emerald/15 text-emerald-400" : "bg-crimson/15 text-crimson-400")}>{msg.text}</p>}
        <p className="text-xs leading-relaxed text-ivory/40">Graphics use the live table, fixtures and results, so they are always current. Size 1080 × 1350, ready for WhatsApp status and Instagram. Saving keeps you in the app.</p>
      </div>

      <div ref={box} className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl" style={{ height: POSTER_H * scale }}>
        {spec ? (
          <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <div ref={node}>
              <Poster spec={spec} />
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center text-sm text-ivory/50">Nothing to show yet.</div>
        )}
      </div>
    </div>
  );
}
