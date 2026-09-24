"use client";

import { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui";

export type CardData = {
  name: string;
  memberId: string; // BL 2026 00001 4
  cardCode: string; // signed code in the QR
  tier: string; // e.g. Premium
  intake: string | null; // "2012 intake"
  club: { name: string; crest: string } | null;
  since: string; // "SEP 2026"
  qrSvg: string;
  verifyHost: string;
};

/* All sizes inside a face are in em: the card scales from one font-size, so it stays sharp and in proportion at any width. */

const FACE = "absolute inset-0 overflow-hidden rounded-[0.95em] text-[#F6F1E7] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";

function Guilloche({ id }: { id: string }) {
  // Fine security-style line pattern, drawn once in SVG
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]" viewBox="0 0 400 252" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#EEDDB4" />
          <stop offset="1" stopColor="#D6B676" stopOpacity=".2" />
        </linearGradient>
      </defs>
      {Array.from({ length: 22 }).map((_, i) => (
        <path key={i} d={`M-20 ${40 + i * 9} C 90 ${-10 + i * 11}, 200 ${120 + i * 6}, 420 ${20 + i * 10}`} fill="none" stroke={`url(#g-${id})`} strokeWidth=".6" />
      ))}
    </svg>
  );
}

export function CardFront({ d, id = "f" }: { d: CardData; id?: string }) {
  const groups = d.memberId.split(" ");
  return (
    <div className={FACE} style={{ background: "linear-gradient(135deg,#0B1022 0%,#1B2033 38%,#5A0F29 78%,#A91C44 100%)" }}>
      <Guilloche id={id} />
      {/* foil sweep */}
      <div className="pointer-events-none absolute -inset-[20%] rotate-12 bg-[linear-gradient(100deg,transparent_35%,rgba(238,221,180,.16)_48%,rgba(255,255,255,.05)_52%,transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-[0.95em] ring-1 ring-inset ring-[#D6B676]/45" />
      <img src="/crests/bosa-logo.png" alt="" className="pointer-events-none absolute -bottom-[1.4em] -right-[1em] w-[9em] opacity-[0.08]" />

      <div className="relative flex h-full flex-col p-[1.05em]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[0.5em]">
            <img src="/crests/bosa-logo.png" alt="BOSA" className="w-[2.1em]" />
            <div className="leading-none">
              <div className="font-display text-[0.8em] font-semibold tracking-[0.2em]">BOSA LEAGUE</div>
              <div className="mt-[0.35em] text-[0.42em] font-semibold uppercase tracking-[0.34em] text-[#E7CF98]">Bilal Institute Old Students</div>
            </div>
          </div>
          <div className="text-right leading-none">
            <div className="bg-gradient-to-br from-[#F4E6C2] via-[#D6B676] to-[#9C7A44] bg-clip-text font-display text-[0.95em] font-semibold uppercase tracking-[0.16em] text-transparent">{d.tier}</div>
            <div className="mt-[0.35em] text-[0.4em] uppercase tracking-[0.3em] text-[#F6F1E7]/60">Member</div>
          </div>
        </div>

        {/* chip */}
        <div className="mt-[0.9em] flex items-center gap-[0.7em]">
          <div className="relative h-[1.55em] w-[2.05em] overflow-hidden rounded-[0.3em] bg-gradient-to-br from-[#F4E6C2] via-[#C9A55E] to-[#8C6E3E] shadow-[inset_0_0_0_0.05em_rgba(0,0,0,.25)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
            <div className="absolute inset-y-0 left-1/3 w-px bg-black/25" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-black/25" />
          </div>
          <svg viewBox="0 0 24 24" className="w-[1.05em] text-[#F6F1E7]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8.5 7.5a6 6 0 0 1 0 9M12 5a9.5 9.5 0 0 1 0 14M15.5 2.5a13 13 0 0 1 0 19" />
          </svg>
        </div>

        <div className="mt-auto">
          <div className="flex gap-[0.55em] font-mono text-[0.98em] font-semibold tracking-[0.08em] text-[#F6F1E7] [text-shadow:0_0.06em_0_rgba(0,0,0,.55),0_-0.03em_0_rgba(255,255,255,.18)]">
            {groups.map((g, i) => (
              <span key={i}>{g}</span>
            ))}
          </div>
          <div className="mt-[0.55em] flex items-end justify-between gap-[0.6em]">
            <div className="min-w-0">
              <div className="text-[0.38em] uppercase tracking-[0.3em] text-[#E7CF98]">Member name</div>
              <div className="truncate font-serif text-[1.02em] leading-tight">{d.name}</div>
              <div className="mt-[0.2em] flex items-center gap-[0.35em] text-[0.46em] uppercase tracking-[0.16em] text-[#F6F1E7]/70">
                {d.club && <img src={d.club.crest} alt="" className="h-[1.5em] w-[1.5em] rounded-full bg-white" />}
                <span className="truncate">{[d.club?.name, d.intake].filter(Boolean).join(" · ") || "BOSA League"}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[0.38em] uppercase tracking-[0.3em] text-[#E7CF98]">Member since</div>
              <div className="font-display text-[0.62em] tracking-[0.14em]">{d.since}</div>
              <div className="mt-[0.2em] text-[0.38em] uppercase tracking-[0.3em] text-[#E7CF98]">Valid</div>
              <div className="font-display text-[0.62em] tracking-[0.14em]">LIFETIME</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardBack({ d }: { d: CardData }) {
  return (
    <div className={FACE} style={{ background: "linear-gradient(160deg,#0A0F1E 0%,#141A2E 55%,#2A0E1C 100%)" }}>
      <div className="pointer-events-none absolute inset-0 rounded-[0.95em] ring-1 ring-inset ring-[#D6B676]/35" />
      <div className="mt-[0.9em] h-[1.9em] w-full bg-[linear-gradient(180deg,#050505,#1a1a1a_50%,#050505)]" />
      <div className="relative flex gap-[0.9em] px-[1.05em] pt-[0.8em]">
        <div className="shrink-0 rounded-[0.4em] bg-white p-[0.3em]">
          <div className="h-[5.6em] w-[5.6em] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: d.qrSvg }} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[0.38em] uppercase tracking-[0.3em] text-[#E7CF98]">Membership ID</div>
          <div className="font-mono text-[0.72em] font-semibold tracking-[0.06em]">{d.memberId}</div>
          <div className="mt-[0.45em] text-[0.38em] uppercase tracking-[0.3em] text-[#E7CF98]">Verification code</div>
          <div className="font-mono text-[0.56em] tracking-[0.05em] text-[#F6F1E7]/85">{d.cardCode}</div>
          <div className="mt-[0.55em] text-[0.42em] leading-snug text-[#F6F1E7]/60">
            Scan to confirm membership, or visit {d.verifyHost}/verify. Show this card at BOSA partners for member offers.
          </div>
        </div>
      </div>
      <div className="absolute inset-x-[1.05em] bottom-[0.8em] flex items-end justify-between gap-[0.6em]">
        <div className="min-w-0 flex-1">
          <div className="flex h-[1.4em] items-center overflow-hidden rounded-[0.2em] bg-[repeating-linear-gradient(135deg,#F6F1E7_0_0.25em,#EDE4D1_0.25em_0.5em)] px-[0.5em]">
            <span className="truncate font-serif text-[0.62em] italic leading-none text-[#0A0F1E]/80">{d.name}</span>
          </div>
          <div className="mt-[0.2em] text-[0.34em] uppercase tracking-[0.2em] text-[#F6F1E7]/45">Personal, not transferable. Property of BOSA League.</div>
        </div>
        <img src="/crests/bosa-logo.png" alt="" className="w-[1.8em] opacity-80" />
      </div>
    </div>
  );
}

/** Flippable card with download, share and print. */
export function MemberCard({ d, fileName }: { d: CardData; fileName: string }) {
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const render = useCallback(async () => {
    const { toBlob } = await import("html-to-image");
    const node = exportRef.current!;
    // Two passes: the first warms up fonts and images so the saved file matches the screen
    await toBlob(node, { pixelRatio: 1, cacheBust: false }).catch(() => null);
    const blob = await toBlob(node, { pixelRatio: 3, cacheBust: false, backgroundColor: "#060913" });
    if (!blob) throw new Error("render failed");
    return blob;
  }, []);

  const download = useCallback(async () => {
    setBusy("download");
    setMsg(null);
    try {
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMsg("Card saved. Look in your Downloads or Photos.");
    } catch {
      setMsg("Could not create the image. Try Print instead.");
    } finally {
      setBusy(null);
    }
  }, [render, fileName]);

  const share = useCallback(async () => {
    setBusy("share");
    setMsg(null);
    try {
      const blob = await render();
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "My BOSA member card" });
      } else {
        await download();
        return;
      }
    } catch {
      /* closed the share sheet */
    } finally {
      setBusy(null);
    }
  }, [render, fileName, download]);

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show the front of the card" : "Show the back of the card"}
        className="group block w-full text-left [perspective:1400px]"
        style={{ fontSize: "min(calc((100vw - 32px) / 20), 22px)" }}
      >
        <div
          className={clsx("relative aspect-[1.586/1] w-full rounded-[0.95em] shadow-[0_2.2em_4em_-1.6em_rgba(169,28,68,.65)] transition-transform duration-700 [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}
        >
          <CardFront d={d} />
          <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]">
            <CardBack d={d} />
          </div>
        </div>
      </button>
      <div className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-ivory/40">Tap the card to see the {flipped ? "front" : "QR code"}</div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button onClick={download} disabled={!!busy} className="btn-gold px-2 text-xs sm:text-sm">
          <Icon name="download" size={15} /> {busy === "download" ? "Saving" : "Download"}
        </button>
        <button onClick={share} disabled={!!busy} className="btn-ghost px-2 text-xs sm:text-sm">
          <Icon name="arrowRight" size={15} /> {busy === "share" ? "Opening" : "Share"}
        </button>
        <button onClick={() => window.print()} className="btn-ghost px-2 text-xs sm:text-sm">
          <Icon name="card" size={15} /> Print
        </button>
      </div>
      {msg && <p className="mt-3 text-center text-xs text-ivory/60">{msg}</p>}

      {/* Off-screen, fixed-size copy used for the downloaded image and for printing: front and back, side by side on paper */}
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 print:static print:left-auto">
        <div id="member-card-export" ref={exportRef} className="w-[480px] bg-[#060913] p-[20px]" style={{ fontSize: "22px" }}>
          <div className="relative aspect-[1.586/1] w-[440px]">
            <CardFront d={d} id="x1" />
          </div>
          <div className="relative mt-[16px] aspect-[1.586/1] w-[440px]">
            <CardBack d={d} />
          </div>
          <div className="mt-[12px] text-center font-sans text-[10px] uppercase tracking-[0.3em] text-[#F6F1E7]/40">BOSA League · Official member card</div>
        </div>
      </div>
    </div>
  );
}
