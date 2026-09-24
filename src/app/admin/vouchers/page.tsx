import Link from "next/link";
import { pool } from "@/db";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Field, Submit } from "@/components/form";
import { Pill, StatTile } from "@/components/ui";
import { CountUp } from "@/components/motion";
import { requirePermission } from "@/lib/auth";
import { fmtDateTime, ugx } from "@/lib/format";
import { getMembershipPrice } from "@/lib/data";
import { generateVouchersAction, markVouchersIssuedAction, voidVoucherAction } from "@/app/actions/admin";

export const metadata = { title: "Vouchers" };

type Row = { code: string; batch: string; status: string; note: string | null; used_at: Date | null; used_by: string | null; email: string | null };

export default async function VouchersPage({ searchParams }: { searchParams: { q?: string; status?: string; batch?: string } }) {
  await requirePermission("payments");
  const price = await getMembershipPrice();
  const status = ["UNUSED", "USED", "VOID"].includes(searchParams.status ?? "") ? searchParams.status! : "ALL";
  const q = (searchParams.q ?? "").trim().toUpperCase();
  const [kpi, batches, list] = await Promise.all([
    pool.query("select count(*)::int total, count(*) filter (where status='UNUSED')::int unused, count(*) filter (where status='USED')::int used, count(*) filter (where status='VOID')::int void from vouchers"),
    pool.query(
      "select batch, count(*)::int total, count(*) filter (where status='UNUSED')::int unused, count(*) filter (where status='USED')::int used, min(created_at) created, max(note) note from vouchers group by batch order by min(created_at) desc",
    ),
    pool.query(
      `select v.code, v.batch, v.status, v.note, v.used_at, u.name used_by, u.email from vouchers v left join users u on u.id=v.used_by_id
       where ($1='ALL' or v.status=$1) and ($2='' or v.code like '%'||$2||'%' or upper(coalesce(u.name,'')) like '%'||$2||'%' or upper(coalesce(u.email,'')) like '%'||$2||'%')
         and ($3::text is null or v.batch=$3)
       order by v.used_at desc nulls last, v.code limit 200`,
      [status, q, searchParams.batch ?? null],
    ),
  ]);
  const k = kpi.rows[0];
  const rows = list.rows as Row[];

  return (
    <>
      <PageHeader eyebrow="One-time membership codes" title="Vouchers">
        <Link href="/api/vouchers?status=UNUSED" className="btn-ghost btn-sm">
          Download unused (CSV)
        </Link>
      </PageHeader>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="Vouchers created"><CountUp value={k.total} /></StatTile>
        <StatTile label="Still unused" accent="emerald"><CountUp value={k.unused} /></StatTile>
        <StatTile label="Used: members activated" hint={`Worth ${ugx(k.used * price)} at ${ugx(price)} each`}><CountUp value={k.used} /></StatTile>
        <StatTile label="Cancelled" accent="crimson"><CountUp value={k.void} /></StatTile>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="panel p-6">
          <div className="eyebrow mb-2">How it works</div>
          <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ivory/65">
            <li>Sell a voucher for {ugx(price)} (cash or Mobile Money to the League office).</li>
            <li>Give the buyer one printed code, e.g. BOSA-7KQ4-M9XT.</li>
            <li>They enter it when creating their account, or on the Membership page if they already have one.</li>
            <li>Membership switches on at once. Each code works one time only.</li>
          </ol>
        </div>

        <div className="panel p-6">
          <div className="eyebrow mb-4">Create vouchers</div>
          <ActionForm action={generateVouchersAction} className="space-y-4" resetOnSuccess>
            <div className="grid grid-cols-2 gap-3">
              <Field label="How many">
                <input name="count" type="number" min={1} max={5000} defaultValue={100} className="input" required />
              </Field>
              <Field label="Batch name">
                <input name="batch" className="input" placeholder="e.g. Matchday 6 sales" />
              </Field>
            </div>
            <Submit pendingText="Creating...">Create vouchers</Submit>
          </ActionForm>
        </div>

        <div className="panel p-6">
          <div className="eyebrow mb-4">Cancel a voucher</div>
          <p className="mb-4 text-xs text-ivory/50">For a lost or stolen card that has not been used yet.</p>
          <ActionForm action={voidVoucherAction} className="space-y-3" resetOnSuccess confirm="Cancel this voucher? It will stop working immediately.">
            <Field label="Code">
              <input name="code" className="input font-mono uppercase" placeholder="BOSA-XXXX-XXXX" required />
            </Field>
            <Field label="Reason (optional)">
              <input name="note" className="input" placeholder="e.g. card lost" />
            </Field>
            <Submit className="btn-danger">Cancel voucher</Submit>
          </ActionForm>
        </div>
      </div>

      <div className="mt-10">
        <div className="eyebrow mb-4">Batches</div>
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07]">
          {batches.rows.map((b: { batch: string; total: number; unused: number; used: number; created: Date; note: string | null }) => (
            <div key={b.batch} className="flex flex-wrap items-center gap-3 bg-night-800/50 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.batch}</div>
                <div className="text-xs text-ivory/45">
                  Created {fmtDateTime(b.created)} · {b.used} used of {b.total} · {b.unused} left{b.note ? ` · Given to: ${b.note}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/print/vouchers?batch=${encodeURIComponent(b.batch)}`} className="btn-gold btn-sm">
                  Print cards
                </Link>
                <Link href={`/api/vouchers?status=UNUSED&batch=${encodeURIComponent(b.batch)}`} className="btn-ghost btn-sm">
                  CSV
                </Link>
                <Link href={`/admin/vouchers?batch=${encodeURIComponent(b.batch)}`} className="btn-quiet btn-sm">
                  View
                </Link>
              </div>
              <ActionForm action={markVouchersIssuedAction} className="flex w-full gap-2 sm:w-auto">
                <input type="hidden" name="batch" value={b.batch} />
                <input name="note" className="input h-10 py-0 text-sm" placeholder="Given to (seller)" defaultValue={b.note ?? ""} />
                <Submit className="btn-quiet btn-sm">Save</Submit>
              </ActionForm>
            </div>
          ))}
          {batches.rows.length === 0 && <div className="px-5 py-8 text-center text-sm text-ivory/45">No vouchers yet. Create a batch above.</div>}
        </div>
      </div>

      <div className="mt-10">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="label">Search code, name or email</label>
            <input name="q" defaultValue={searchParams.q} className="input" placeholder="BOSA-7KQ4 or a member's name" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={status} className="input">
              <option value="ALL">All</option>
              <option value="UNUSED">Unused</option>
              <option value="USED">Used</option>
              <option value="VOID">Cancelled</option>
            </select>
          </div>
          {searchParams.batch && <input type="hidden" name="batch" value={searchParams.batch} />}
          <button className="btn-ghost">Search</button>
        </form>
        <div className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.07]">
          {rows.map((r) => (
            <div key={r.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-night-800/40 px-4 py-3 text-sm">
              <span className="font-mono tracking-wider">{r.code}</span>
              <Pill tone={r.status === "UNUSED" ? "emerald" : r.status === "USED" ? "gold" : "crimson"}>{r.status === "VOID" ? "CANCELLED" : r.status}</Pill>
              <span className="text-xs text-ivory/45">{r.batch}</span>
              <span className="ml-auto text-xs text-ivory/60">{r.used_by ? `${r.used_by} · ${r.email} · ${fmtDateTime(r.used_at!)}` : r.note ?? ""}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="px-5 py-8 text-center text-sm text-ivory/45">No vouchers match.</div>}
        </div>
        <p className="mt-3 text-xs text-ivory/40">Showing up to 200. Download the CSV for the full list.</p>
      </div>
    </>
  );
}
