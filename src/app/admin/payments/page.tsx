import { desc } from "drizzle-orm";
import { db, pool } from "@/db";
import { payments } from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { Pill, StatTile } from "@/components/ui";
import { CountUp } from "@/components/motion";
import { requirePermission } from "@/lib/auth";
import { fmtDateTime, ugx } from "@/lib/format";
import { pesapalConfigured } from "@/lib/pesapal";

export const metadata = { title: "Memberships" };

export default async function AdminPayments() {
  await requirePermission("payments");
  const list = await db.query.payments.findMany({ with: { user: true }, orderBy: desc(payments.createdAt), limit: 300 });
  const { rows } = await pool.query(
    "select coalesce(sum(amount) filter (where status='COMPLETED'),0)::int revenue, count(*) filter (where status='COMPLETED')::int done, count(*) filter (where status='PENDING')::int pending, (select count(*) from users where membership='ACTIVE' and role in ('STUDENT_FAN','ALUMNI_FAN','PLAYER'))::int members from payments",
  );
  const k = rows[0];
  return (
    <>
      <PageHeader eyebrow={pesapalConfigured() ? "Pesapal connected" : "Pesapal keys not set: demo mode"} title="Memberships" />
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="Revenue" accent="emerald"><span className="text-3xl">UGX <CountUp value={k.revenue} /></span></StatTile>
        <StatTile label="Active members"><CountUp value={k.members} /></StatTile>
        <StatTile label="Completed payments"><CountUp value={k.done} /></StatTile>
        <StatTile label="Pending" accent="crimson"><CountUp value={k.pending} /></StatTile>
      </div>
      <div className="panel overflow-x-auto p-2 scrollbar-none">
        <table className="table-luxe min-w-[820px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{fmtDateTime(p.createdAt)}</td>
                <td>
                  <div className="font-semibold">{p.user.name}</div>
                  <div className="text-xs text-ivory/45">{p.user.email}</div>
                </td>
                <td>{ugx(p.amount)}</td>
                <td className="text-xs text-ivory/60">{p.method ?? p.provider}</td>
                <td className="font-mono text-[11px] text-ivory/50">{p.confirmationCode ?? p.merchantRef}</td>
                <td>
                  <Pill tone={p.status === "COMPLETED" ? "emerald" : p.status === "PENDING" ? "gold" : "crimson"}>{p.status}</Pill>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-ivory/45">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
