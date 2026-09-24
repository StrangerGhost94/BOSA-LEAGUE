"use client";

import { useFormState, useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";
import { useDrawer } from "@/components/drawer";

export type ActionResult = { ok: boolean; message: string; at?: number } | null;
export type FormAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  toast = true,
  closeOnSuccess = true,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  toast?: boolean;
  closeOnSuccess?: boolean;
}) {
  const [state, formAction] = useFormState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const drawer = useDrawer();
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
    if (state?.ok && drawer && closeOnSuccess) {
      const t = setTimeout(() => drawer.close(), 700);
      return () => clearTimeout(t);
    }
  }, [state, resetOnSuccess, drawer, closeOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {toast && !drawer ? <Toast state={state} /> : <InlineMessage state={state} />}
    </form>
  );
}

export function InlineMessage({ state }: { state: ActionResult }) {
  return (
    <AnimatePresence mode="wait">
      {state?.message && (
        <motion.p
          key={(state.at ?? 0) + state.message}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={clsx(
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            state.ok ? "border-emerald/30 bg-emerald/10 text-emerald-400" : "border-crimson/30 bg-crimson/10 text-crimson-400",
          )}
          role="status"
        >
          {state.message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Toast({ state }: { state: ActionResult }) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.75rem)] left-1/2 z-[90] -translate-x-1/2 xl:bottom-[calc(1.5rem+var(--safe-bottom))]">
      <AnimatePresence mode="wait">
        {state?.message && (
          <motion.div
            key={(state.at ?? 0) + state.message}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={clsx(
              "glass pointer-events-auto flex items-center gap-3 rounded-full px-5 py-3 text-sm shadow-2xl",
              state.ok ? "text-ivory" : "text-crimson-400",
            )}
            role="status"
          >
            <span className={clsx("h-2 w-2 rounded-full", state.ok ? "bg-emerald-400" : "bg-crimson-400")} />
            {state.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Submit({ children, className = "btn-primary", pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
