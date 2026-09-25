import { pool } from "@/db";
import { requirePermission } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { ugx } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print vouchers" };

/** Printable A4 sheet of voucher cards (3 across, 8 down) for the unused codes in a batch. */
export default async function PrintVouchers({ searchParams }: { searchParams: { batch?: string } }) {
  await requirePermission("payments");
  const price = await getMembershipPrice();
  const { rows } = await pool.query("select code from vouchers where status='UNUSED' and ($1::text is null or batch=$1) order by code", [searchParams.batch ?? null]);
  const base = (process.env.APP_URL || "").replace(/^https?:\/\//, "") || "bosa-league";
  return (
    <div className="voucher-print min-h-screen p-4" style={{ background: "#fff", color: "#000", colorScheme: "light" }}>
      <style>{`
        @page { size: A4; margin: 10mm; }
        :root { color-scheme: light !important; }
        html, body { background: #fff !important; color: #000 !important; }
        .grain { display: none !important; }
        .voucher-print .card { background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; break-inside: avoid; }
        @media print {
          .no-print { display: none !important; }
          .voucher-print, .voucher-print * { visibility: visible !important; }
          .voucher-print { position: absolute; top: 0; left: 0; right: 0; min-height: 0 !important; padding: 0 !important; }
        }
      `}</style>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="text-sm">
          {rows.length} unused voucher{rows.length === 1 ? "" : "s"}
          {searchParams.batch ? ` in "${searchParams.batch}"` : ""}. Print on A4, then cut along the lines.
        </div>
        <PrintButton />
      </div>
      <div className="grid grid-cols-3">
        {rows.map((r: { code: string }) => (
          <div key={r.code} className="card flex h-[34mm] flex-col justify-between border border-dashed p-[3mm]" style={{ borderColor: "#777" }}>
            <div className="flex items-baseline justify-between text-[8pt] font-bold uppercase tracking-[0.12em]">
              <span>BOSA League</span>
              <span>{ugx(price)}</span>
            </div>
            <div className="text-center font-mono text-[15pt] font-bold tracking-[0.1em]">{r.code}</div>
            <div className="text-center text-[7.5pt]">Redeem once at {base}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
