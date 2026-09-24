"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";

export type FilterDef =
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; all?: string }
  | { name: string; label: string; type: "date" }
  | { name: string; label: string; type: "search"; placeholder?: string };

export function FilterBar({ filters, className }: { filters: FilterDef[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const set = (name: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    p.delete("page");
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  const active = filters.filter((f) => sp.get(f.name)).length;

  return (
    <div className={clsx("glass relative rounded-2xl p-4", className)}>
      {pending && <div className="absolute inset-x-6 top-0 h-px overflow-hidden"><div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-gold to-transparent" /></div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:flex lg:flex-wrap lg:items-end">
        {filters.map((f) => (
          <label key={f.name} className={clsx("block", f.type === "search" ? "col-span-2 lg:min-w-[240px] lg:flex-1" : "lg:w-auto lg:min-w-[160px]")}>
            <span className="label">{f.label}</span>
            {f.type === "select" && (
              <select className="input" value={sp.get(f.name) ?? ""} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">{f.all ?? "All"}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            {f.type === "date" && <input type="date" className="input" value={sp.get(f.name) ?? ""} onChange={(e) => set(f.name, e.target.value)} />}
            {f.type === "search" && (
              <input
                type="search"
                className="input"
                placeholder={f.placeholder}
                defaultValue={sp.get(f.name) ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  clearTimeout((window as unknown as { __ft?: number }).__ft);
                  (window as unknown as { __ft?: number }).__ft = window.setTimeout(() => set(f.name, v), 280);
                }}
              />
            )}
          </label>
        ))}
        {active > 0 && (
          <button onClick={() => start(() => router.replace(pathname, { scroll: false }))} className="btn-quiet btn-sm col-span-2 self-end lg:col-span-1">
            Clear filters ({active})
          </button>
        )}
      </div>
    </div>
  );
}
