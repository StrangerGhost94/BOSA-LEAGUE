"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";

/** Shown once when this phone's session was ended by a newer sign-in elsewhere. */
export function SignedOutNotice() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="container-x fixed inset-x-0 top-[calc(var(--header-h)+var(--safe-top)+0.5rem)] z-40">
      <div className="relative flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-night-800/95 py-3 pl-4 pr-12 text-sm shadow-2xl backdrop-blur">
        <span className="flex-1 text-ivory/80">You were signed out because your account was signed in on another phone (or the League office ended your session).</span>
        <a href="/sign-in" className="btn-gold btn-sm">
          Sign in again
        </a>
        <button onClick={() => setOpen(false)} aria-label="Dismiss" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-ivory/50 hover:bg-white/5">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
