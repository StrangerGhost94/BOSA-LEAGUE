"use client";

import { Icon } from "@/components/ui";

export function CardActions() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={() => window.print()} className="btn-ghost btn-sm">
        <Icon name="download" size={14} /> Save or print
      </button>
      <span className="self-center text-xs text-ivory/40">Tip: add this page to your home screen for quick access.</span>
    </div>
  );
}
