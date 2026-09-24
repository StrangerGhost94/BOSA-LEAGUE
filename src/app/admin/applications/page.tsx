import { desc } from "drizzle-orm";
import { db } from "@/db";
import { teamApplications } from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Submit } from "@/components/form";
import { EmptyState, Pill } from "@/components/ui";
import { reviewApplicationAction } from "@/app/actions/admin";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Team applications" };

export default async function Applications() {
  const list = await db.query.teamApplications.findMany({ orderBy: desc(teamApplications.createdAt) });
  return (
    <>
      <PageHeader eyebrow="Super League registration" title="Team applications" />
      {list.length === 0 && <EmptyState title="No applications yet" body="Applications submitted on the Super League page appear here." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((a) => (
          <div key={a.id} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl">{a.teamName}</h3>
                <div className="text-sm text-ivory/55">
                  {a.campus ? `Year group: ${a.campus}` : "Year group not given"} · squad of {a.squadSize ?? "?"}
                </div>
              </div>
              <Pill tone={a.status === "APPROVED" ? "emerald" : a.status === "DECLINED" ? "crimson" : "gold"}>{a.status}</Pill>
            </div>
            <div className="mt-4 text-sm text-ivory/70">
              {a.contactName} · {a.phone} · {a.email}
            </div>
            {a.message && <p className="mt-3 rounded-xl bg-white/[0.03] p-3 text-sm text-ivory/60">{a.message}</p>}
            <div className="mt-4 flex items-center gap-2">
              <span className="mr-auto text-xs text-ivory/40">{fmtDateTime(a.createdAt)}</span>
              {["APPROVED", "DECLINED"].map((st) => (
                <ActionForm key={st} action={reviewApplicationAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value={st} />
                  <Submit className={st === "APPROVED" ? "btn-gold btn-sm" : "btn-danger btn-sm"}>{st === "APPROVED" ? "Approve" : "Decline"}</Submit>
                </ActionForm>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
