import { pool } from "@/db";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Field, Submit } from "@/components/form";
import { EmptyState, Pill, StatTile } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { getTeams } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { PUSH_TYPE_LABEL, pushConfigured, type PushType } from "@/lib/push";
import { sendAnnouncementAction } from "@/app/actions/notifications";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsAdmin() {
  const me = await requirePermission("news");
  // Only the Super Admin sees the list of individual members
  const everyone = me.role === "SUPER_ADMIN";
  const configured = pushConfigured();
  const [teams, devices, people, recent] = await Promise.all([
    getTeams(),
    pool.query<{ platform: string; n: number }>("select coalesce(platform,'other') platform, count(*)::int n from push_subscriptions where revoked_at is null group by 1 order by 2 desc"),
    pool.query<{ id: string; name: string; team: string | null }>(
      `select distinct u.id, u.name, t.name team from users u
         join push_subscriptions s on s.user_id = u.id and s.revoked_at is null
         left join teams t on t.id = u.team_id
       where u.active order by u.name limit 1000`,
    ),
    pool.query<{ notification_id: string; type: PushType; at: Date; sent: number; failed: number; expired: number; people: number }>(
      `select notification_id, min(notification_type) as type, min(created_at) as at,
              count(*) filter (where status = 'sent' and subscription_id is not null)::int sent,
              count(*) filter (where status = 'failed' and subscription_id is not null)::int failed,
              count(*) filter (where status = 'expired')::int expired,
              count(distinct user_id)::int people
         from notification_logs where created_at > now() - interval '30 days'
        group by notification_id order by min(created_at) desc limit 25`,
    ),
  ]);
  const totalDevices = devices.rows.reduce((a, r) => a + r.n, 0);
  const label: Record<string, string> = { ios: "iPhone / iPad", android: "Android", desktop: "Computer", other: "Other" };

  return (
    <>
      <PageHeader eyebrow="Publishing" title="Notifications" />

      {!configured && (
        <div className="panel mb-8 border-crimson/40 p-5 text-sm text-ivory/70">
          Push is switched off: the server needs <span className="font-mono text-ivory">VAPID_PUBLIC_KEY</span>, <span className="font-mono text-ivory">VAPID_PRIVATE_KEY</span> and{" "}
          <span className="font-mono text-ivory">VAPID_SUBJECT</span>. Members can&apos;t enable notifications until they are set.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="People reachable">{people.rows.length}</StatTile>
        <StatTile label="Devices" hint={devices.rows.map((d) => `${label[d.platform] ?? d.platform} ${d.n}`).join(" · ") || undefined}>
          {totalDevices}
        </StatTile>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="panel p-6">
          <div className="eyebrow mb-2">Send a notification</div>
          <p className="mb-5 text-xs leading-relaxed text-ivory/50">
            Goals, results and match reminders go out automatically. Use this for news. It reaches members who turned notifications on and haven&apos;t switched that kind off. Keep it short: it shows on lock screens.
          </p>
          <ActionForm action={sendAnnouncementAction} className="grid gap-5" resetOnSuccess confirm="Send this notification now? It can't be recalled.">
            <Field label="Kind">
              <select name="type" className="input" defaultValue="LEAGUE_ANNOUNCEMENT">
                {(["LEAGUE_ANNOUNCEMENT", "TEAM_UPDATE", "FIXTURE", "GENERAL"] as PushType[]).map((t) => (
                  <option key={t} value={t}>
                    {PUSH_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title (up to 60 characters)">
              <input name="title" maxLength={60} required className="input" placeholder="Matchday 5 moved to Saturday" />
            </Field>
            <Field label="Message (up to 180 characters)">
              <textarea name="body" maxLength={180} required rows={3} className="input" placeholder="All matches kick off at the usual times. Tap for the fixtures." />
            </Field>
            <Field label="Opens (a page on this site)">
              <input name="url" defaultValue="/" className="input font-mono" placeholder="/fixtures" />
            </Field>
            <Field label="Send to">
              <select name="audience" className="input" defaultValue="all">
                <option value="all">All members with notifications on</option>
                <option value="team">One club (its players and fans)</option>
                {everyone && <option value="users">Selected people (tick below)</option>}
              </select>
            </Field>
            <Field label="Club (when sending to one club)">
              <select name="teamId" className="input" defaultValue="">
                <option value="">Choose a club</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            {everyone && (
            <details className="rounded-xl border border-white/[0.07] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-gold">People (when sending to selected people): {people.rows.length}</summary>
              <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {people.rows.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 py-1 text-sm">
                    <input type="checkbox" name="userIds" value={p.id} className="h-4 w-4 accent-[#D6B676]" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.team && <span className="text-xs text-ivory/40">{p.team}</span>}
                  </label>
                ))}
                {people.rows.length === 0 && <p className="text-xs text-ivory/45">Nobody has turned notifications on yet.</p>}
              </div>
            </details>
            )}
            <div>
              <Submit className="btn-gold" pendingText="Sending...">
                Send notification
              </Submit>
            </div>
          </ActionForm>
        </div>

        <div className="panel p-6">
          <div className="eyebrow mb-4">Last 30 days</div>
          {recent.rows.length === 0 ? (
            <EmptyState title="Nothing sent yet" />
          ) : (
            <ul className="divide-y divide-white/[0.06] text-sm">
              {recent.rows.map((r) => (
                <li key={r.notification_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{PUSH_TYPE_LABEL[r.type] ?? r.type}</div>
                    <div className="text-xs text-ivory/45">
                      {fmtDateTime(r.at)} · {r.people} {r.people === 1 ? "person" : "people"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone="emerald">{r.sent} delivered</Pill>
                    {r.failed > 0 && <Pill tone="crimson">{r.failed} failed</Pill>}
                    {r.expired > 0 && <Pill>{r.expired} old devices removed</Pill>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ivory/40">&quot;Delivered&quot; means the phone&apos;s push service accepted it. Phones that are off get it when they come back online.</p>
        </div>
      </div>
    </>
  );
}
