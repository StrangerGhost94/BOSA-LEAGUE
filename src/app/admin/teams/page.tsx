import Link from "next/link";
import { pool } from "@/db";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { TeamForm } from "@/components/admin/team-form";
import { Crest } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { getTeams } from "@/lib/data";

export const metadata = { title: "Teams" };

export default async function AdminTeams() {
  const teams = await getTeams();
  const { rows } = await pool.query(
    `select t.id, count(p.id) filter (where p.status not in ('PENDING','REJECTED'))::int squad, count(p.id) filter (where p.status='PENDING')::int pending,
      (select string_agg(u.name, ', ') from users u where u.team_id=t.id and u.role='TEAM_MANAGER') managers
     from teams t left join players p on p.team_id=t.id group by t.id`,
  );
  const info = Object.fromEntries(rows.map((r: { id: string; squad: number; pending: number; managers: string | null }) => [r.id, r]));
  return (
    <>
      <PageHeader eyebrow={`${teams.length} registered clubs`} title="Teams">
        <Drawer label="Register club" title="Register a new club" icon="plus">
          <TeamForm />
        </Drawer>
      </PageHeader>
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((t) => (
          <StaggerItem key={t.id}>
            <div className="panel group relative overflow-hidden p-5 transition hover:border-gold/25">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.primaryColor}, ${t.secondaryColor})` }} />
              <div className="flex items-center gap-4">
                <Crest team={t} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-xl">{t.name}</div>
                  <div className="truncate text-xs text-ivory/50">{t.campus}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <div className="font-display text-lg">{info[t.id]?.squad ?? 0}</div>
                  <div className="text-ivory/40">Squad</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <div className="font-display text-lg text-gold">{info[t.id]?.pending ?? 0}</div>
                  <div className="text-ivory/40">Pending</div>
                </div>
                <div className="rounded-lg bg-white/[0.03] py-2">
                  <div className="font-display text-lg">{t.founded}</div>
                  <div className="text-ivory/40">Founded</div>
                </div>
              </div>
              <div className="mt-4 truncate text-xs text-ivory/50">Manager: {info[t.id]?.managers ?? "Unassigned"}</div>
              <div className="mt-4 flex gap-2">
                <Drawer label="Edit" title={`Edit ${t.name}`} buttonClass="btn-ghost btn-sm">
                  <TeamForm team={t} />
                </Drawer>
                <Link href={`/admin/players?team=${t.id}`} className="btn-quiet btn-sm">
                  Squad
                </Link>
                <Link href={`/teams/${t.slug}`} className="btn-quiet btn-sm">
                  Public page
                </Link>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}
