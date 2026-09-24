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
    <div className="voucher-print min-h-screen bg-white p-4 text-[#0A0F1E]">
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .grain { display: none !important; }
          .voucher-print, .voucher-print * { visibility: visible !important; }
          .voucher-print { position: absolute; inset: 0; padding: 0 !important; }
        }
        .voucher-print .card { break-inside: avoid; }
      `}</style>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="text-sm">
          {rows.length} unused voucher{rows.length === 1 ? "" : "s"}
          {searchParams.batch ? ` in "${searchParams.batch}"` : ""}. Print on A4, then cut along the lines.
        </div>
        <PrintButton />
      </div>
      <div className="grid grid-cols-3 gap-0">
        {rows.map((r: { code: string }) => (
          <div key={r.code} className="card flex h-[34mm] flex-col justify-between border border-dashed border-[#999] p-[3mm]">
            <div className="flex items-center justify-between">
              <span className="text-[9pt] font-bold tracking-[0.14em]">BOSA LEAGUE</span>
              <span className="text-[7pt] uppercase tracking-wider text-[#8c6e3e]">Membership voucher</span>
            </div>
            <div className="text-center font-mono text-[14pt] font-bold tracking-[0.12em]">{r.code}</div>
            <div className="text-[6.5pt] leading-tight text-[#444]">
              One-time membership ({ugx(price)}). Sign up at {base} and enter this code. Valid once only.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
