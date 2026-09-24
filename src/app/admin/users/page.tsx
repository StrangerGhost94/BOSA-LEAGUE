import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { FilterBar } from "@/components/filter-bar";
import { ActionForm, Field, Submit } from "@/components/form";
import { Pill } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABEL, assignableRoles } from "@/lib/roles";
import { createUserAction, updateUserAction } from "@/app/actions/admin";
import { getTeams } from "@/lib/data";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Users & roles" };

export default async function AdminUsers({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const me = await requirePermission("users");
  const teams = await getTeams();
  const conds: SQL[] = [];
  if (searchParams.role) conds.push(eq(s.users.role, searchParams.role as s.Role));
  if (searchParams.q) conds.push(or(ilike(s.users.name, `%${searchParams.q}%`), ilike(s.users.email, `%${searchParams.q}%`))!);
  if (searchParams.member) conds.push(eq(s.users.membership, searchParams.member as "NONE" | "ACTIVE"));
  const users = await db.query.users.findMany({ where: conds.length ? and(...conds) : undefined, with: { team: true }, orderBy: desc(s.users.createdAt), limit: 300 });
  const roles = assignableRoles(me.role);

  return (
    <>
      <PageHeader eyebrow={`${users.length} accounts`} title="Users & roles">
        <Drawer label="Create account" title="Create a staff or member account" description="Share the temporary password privately; the user can change it from My account." icon="plus">
          <ActionForm action={createUserAction} className="space-y-5" resetOnSuccess>
            <Field label="Full name">
              <input name="name" className="input" required />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className="input" required />
            </Field>
            <Field label="Role">
              <select name="role" className="input" defaultValue="TEAM_MANAGER">
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Club (team managers and players)">
              <select name="teamId" className="input" defaultValue="">
                <option value="">None</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Temporary password">
              <input name="password" className="input" minLength={8} required />
            </Field>
            <Submit>Create account</Submit>
          </ActionForm>
        </Drawer>
      </PageHeader>
      <FilterBar
        className="mb-6"
        filters={[
          { name: "q", label: "Search", type: "search", placeholder: "Name or email" },
          { name: "role", label: "Role", type: "select", all: "All roles", options: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })) },
          { name: "member", label: "Membership", type: "select", all: "Any", options: [{ value: "ACTIVE", label: "Active" }, { value: "NONE", label: "Not paid" }] },
        ]}
      />
      <div className="panel overflow-x-auto p-2 scrollbar-none">
        <table className="table-luxe min-w-[860px]">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Club</th>
              <th>Membership</th>
              <th>Last sign-in</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.03]">
                <td>
                  <div className="font-semibold">
                    {u.name} {!u.active && <Pill tone="crimson">Disabled</Pill>}
                  </div>
                  <div className="text-xs text-ivory/45">
                    {u.email}
                    {u.completionYear ? ` · Class of ${u.completionYear}` : ""}
                  </div>
                </td>
                <td className="text-sm">{ROLE_LABEL[u.role]}</td>
                <td className="text-sm text-ivory/60">{u.team?.name ?? "-"}</td>
                <td>{u.membership === "ACTIVE" ? <Pill tone="emerald">Active</Pill> : <Pill>Not paid</Pill>}</td>
                <td className="text-xs text-ivory/45">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                <td className="text-right">
                  <Drawer label="Manage" title={u.name} description={u.email} buttonClass="btn-ghost btn-sm" side="center">
                    <ActionForm action={updateUserAction} className="space-y-5">
                      <input type="hidden" name="id" value={u.id} />
                      <Field label="Role">
                        <select name="role" className="input" defaultValue={u.role}>
                          {Array.from(new Set([u.role, ...roles])).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Club">
                        <select name="teamId" className="input" defaultValue={u.teamId ?? ""}>
                          <option value="">None</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Membership">
                        <select name="membership" className="input" defaultValue={u.membership === "ACTIVE" ? "ACTIVE" : "NONE"}>
                          <option value="ACTIVE">Active (manual approval records a zero-value payment)</option>
                          <option value="NONE">Not active</option>
                        </select>
                      </Field>
                      <label className="flex items-center gap-3 text-sm text-ivory/70">
                        <input type="checkbox" name="active" defaultChecked={u.active} className="accent-[#CC2654]" /> Account enabled
                      </label>
                      <Submit>Save</Submit>
                    </ActionForm>
                  </Drawer>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
