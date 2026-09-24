"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui";

type Item = { id: string; kind: string; caption: string | null; videoUrl: string | null; width: number | null; height: number | null };

export function Lightbox({ items }: { items: Item[] }) {
  const photos = items.filter((i) => i.kind === "PHOTO");
  const videos = items.filter((i) => i.kind === "VIDEO");
  const [open, setOpen] = useState<number | null>(null);
  const go = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + photos.length) % photos.length)), [photos.length]);
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, go]);
  const cur = open !== null ? photos[open] : null;

  return (
    <>
      {videos.length > 0 && (
        <div className="mb-10 grid gap-5 md:grid-cols-2">
          {videos.map((v) => (
            <figure key={v.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <div className="aspect-video">
                <iframe src={v.videoUrl!} title={v.caption ?? "Highlight"} className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
              </div>
              {v.caption && <figcaption className="px-4 py-3 text-sm text-ivory/70">{v.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <button key={p.id} onClick={() => setOpen(i)} className="group relative aspect-square overflow-hidden rounded-xl bg-night-800" aria-label={p.caption ?? `Photo ${i + 1}`}>
            <img src={`/api/media/${p.id}?v=thumb`} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>
      <AnimatePresence>
        {cur && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-night-900/95 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.img
              key={cur.id}
              src={`/api/media/${cur.id}?v=full`}
              alt={cur.caption ?? ""}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                if (info.offset.x > 60) go(-1);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-night-800" onClick={() => setOpen(null)} aria-label="Close">
              <Icon name="close" />
            </button>
            {photos.length > 1 && (
              <>
                <button className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-night-800 sm:grid" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous">
                  <Icon name="arrowLeft" />
                </button>
                <button className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-night-800 sm:grid" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next">
                  <Icon name="arrowRight" />
                </button>
              </>
            )}
            <div className="absolute bottom-5 left-0 right-0 text-center text-sm text-ivory/70">
              {cur.caption ? `${cur.caption} · ` : ""}
              {open! + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
