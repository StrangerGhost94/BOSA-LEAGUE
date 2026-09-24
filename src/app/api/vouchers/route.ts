import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/roles";

/** CSV of vouchers for the League office (payments permission only). ?batch=...&status=UNUSED|USED|VOID|ALL */
export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u || !can(u.role, "payments")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const url = new URL(req.url);
  const batch = url.searchParams.get("batch");
  const status = url.searchParams.get("status") ?? "UNUSED";
  const { rows } = await pool.query(
    `select v.code, v.batch, v.status, v.note, v.used_at, us.name used_by, us.email used_email
     from vouchers v left join users us on us.id=v.used_by_id
     where ($1::text is null or v.batch=$1) and ($2='ALL' or v.status=$2) order by v.batch, v.code`,
    [batch, status],
  );
  const esc = (x: unknown) => {
    const s = x == null ? "" : x instanceof Date ? x.toISOString() : String(x);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [["Code", "Batch", "Status", "Note", "Used at", "Used by", "Email"], ...rows.map((r) => [r.code, r.batch, r.status, r.note, r.used_at, r.used_by, r.used_email])]
    .map((r) => r.map(esc).join(","))
    .join("\n");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="bosa-vouchers-${(batch ?? "all").replace(/\W+/g, "-")}-${status.toLowerCase()}.csv"`, "Cache-Control": "no-store" },
  });
}
