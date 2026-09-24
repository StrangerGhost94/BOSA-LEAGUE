import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { FilterBar } from "@/components/filter-bar";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Activity history" };

export default async function Activity({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await requirePermission("activity");
  const conds: SQL[] = [];
  if (searchParams.entity) conds.push(eq(activityLogs.entity, searchParams.entity));
  if (searchParams.q) conds.push(ilike(activityLogs.action, `%${searchParams.q}%`));
  const list = await db.query.activityLogs.findMany({ where: conds.length ? and(...conds) : undefined, with: { user: true }, orderBy: desc(activityLogs.createdAt), limit: 300 });
  return (
    <>
      <PageHeader eyebrow="Audit trail" title="Activity history">
        <a href="/api/export/activity" className="btn-ghost btn-sm">Export CSV</a>
      </PageHeader>
      <FilterBar
        className="mb-6"
        filters={[
          { name: "q", label: "Action", type: "search", placeholder: "e.g. result, approved" },
          { name: "entity", label: "Area", type: "select", all: "Everything", options: ["Match", "Player", "Team", "Article", "Season", "User", "Rule", "Setting", "Venue", "TeamApplication"].map((v) => ({ value: v, label: v })) },
        ]}
      />
      <div className="panel p-2">
        <ol className="relative">
          {list.map((a) => (
            <li key={a.id} className="grid grid-cols-[150px_1fr] gap-4 border-b border-white/[0.04] px-4 py-3 text-sm last:border-0 sm:grid-cols-[180px_1fr_240px]">
              <span className="text-xs text-ivory/45">{fmtDateTime(a.createdAt)}</span>
              <span>
                <span className="font-semibold">{a.action}</span>
                {a.details && <span className="text-ivory/55"> · {a.details}</span>}
              </span>
              <span className="hidden text-right text-xs text-ivory/45 sm:block">{a.user ? `${a.user.name} · ${ROLE_LABEL[a.user.role]}` : "System / public"}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
