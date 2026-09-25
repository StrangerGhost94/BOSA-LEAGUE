import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { payments } from "@/db/schema";
import { requireUser, hasMembership } from "@/lib/auth";
import { ROLE_LABEL, homeFor } from "@/lib/roles";
import { fmtDateTime, fmtLong, ugx } from "@/lib/format";
import { ActionForm, Field, Submit } from "@/components/form";
import { changePasswordAction, updateProfileAction } from "@/app/actions/account";
import { Crest, Icon, Pill } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { getPlayerStats } from "@/lib/data";
import { completionYears } from "@/lib/years";
import { formatMemberNumber } from "@/lib/members";
import { vapidPublicKey, pushConfigured } from "@/lib/push";
import { PushSettings, type Prefs } from "@/components/push/push-settings";

export const metadata = { title: "My account" };

type View = "profile" | "notifications" | "player" | "payments" | "password";
const TITLES: Record<View, string> = {
  profile: "Personal details",
  notifications: "Match notifications",
  player: "My player registration",
  payments: "Membership & payments",
  password: "Password",
};

type IconName = Parameters<typeof Icon>[0]["name"];

/** One row in a grouped list, like the iPhone Settings app. */
function Row({ href, icon, tint, label, value, danger }: { href: string; icon: IconName; tint: string; label: string; value?: string; danger?: boolean }) {
  return (
    <Link href={href} className="flex min-h-[56px] items-center gap-3.5 px-4 py-3 transition active:bg-white/[0.06] sm:hover:bg-white/[0.03]">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${tint}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-[15px] ${danger ? "text-crimson-400" : "text-ivory"}`}>{label}</span>
      {value && <span className="max-w-[45%] truncate text-sm text-ivory/45">{value}</span>}
      <svg width="8" height="14" viewBox="0 0 8 14" className="shrink-0 text-ivory/25" aria-hidden>
        <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function Group({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div>
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-night-800/70">{children}</div>
      {note && <p className="mt-2 px-4 text-xs text-ivory/40">{note}</p>}
    </div>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: { view?: string } }) {
  const u = await requireUser("/account");
  const member = hasMembership(u);
  const panel = homeFor(u.role);
  const view = (Object.keys(TITLES) as View[]).find((v) => v === searchParams.view) ?? null;
  const initials = u.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  /* ---------------- detail pages ---------------- */
  if (view) {
    return (
      <section className="container-x max-w-2xl pb-16 pt-28 sm:pt-36">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm font-semibold text-gold">
          <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden>
            <path d="M7 1L1 7l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Account
        </Link>
        <h1 className="mt-4 font-serif text-3xl sm:text-4xl">{TITLES[view]}</h1>
        <div className="mt-6">{await Detail({ view, u, member })}</div>
      </section>
    );
  }

  /* ---------------- the list ---------------- */
  return (
    <section className="container-x max-w-2xl pb-16 pt-28 sm:pt-36">
      <FadeIn>
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-night-800/70 p-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-[#9c7f45] font-display text-2xl text-night-900">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-2xl">{u.name}</div>
            <div className="truncate text-sm text-ivory/50">{u.email}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {member ? <Pill tone="emerald">Member</Pill> : <Pill tone="crimson">Not a member yet</Pill>}
              <span className="text-xs text-ivory/40">{ROLE_LABEL[u.role]}</span>
            </div>
          </div>
          {u.team && <Crest team={u.team} size={36} />}
        </div>
      </FadeIn>

      <div className="mt-6 space-y-6">
        {!member && (
          <Group note="One payment unlocks tables, fixtures, live scores, notifications and your member card.">
            <Row href="/membership" icon="sparkle" tint="bg-gold text-night-900" label="Activate membership" />
          </Group>
        )}

        {(member || panel !== "/account") && (
          <Group>
            {member && <Row href="/members/card" icon="card" tint="bg-gold text-night-900" label="My member card" value={u.memberNumber ? formatMemberNumber(u.memberNumber) : undefined} />}
            {member && <Row href="/members/perks" icon="sparkle" tint="bg-[#8b5cf6] text-white" label="Member perks" />}
            {panel !== "/account" && <Row href={panel} icon="grid" tint="bg-[#3b82f6] text-white" label="Open my control panel" />}
          </Group>
        )}

        <Group>
          <Row href="/account?view=profile" icon="user" tint="bg-[#64748b] text-white" label="Personal details" value={u.team?.name ?? undefined} />
          {member && <Row href="/account?view=notifications" icon="bell" tint="bg-crimson text-white" label="Match notifications" />}
          {u.player && <Row href="/account?view=player" icon="shield" tint="bg-emerald text-white" label="My player registration" value={u.player.status === "PENDING" ? "Awaiting approval" : undefined} />}
        </Group>

        <Group>
          <Row href="/account?view=payments" icon="card" tint="bg-[#10b981] text-white" label="Membership & payments" value={member ? "Active" : undefined} />
          <Row href="/account?view=password" icon="lock" tint="bg-[#f59e0b] text-night-900" label="Password" />
        </Group>

        <form action="/api/auth/sign-out" method="post">
          <button className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-white/[0.07] bg-night-800/70 text-[15px] font-semibold text-crimson-400 transition active:bg-white/[0.06]">
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}

type U = Awaited<ReturnType<typeof requireUser>>;

async function Detail({ view, u, member }: { view: View; u: U; member: boolean }) {
  if (view === "profile")
    return (
      <div className="panel p-6">
        <ActionForm action={updateProfileAction} className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <input name="name" defaultValue={u.name} className="input" />
          </Field>
          <Field label="Email">
            <input defaultValue={u.email} disabled className="input opacity-60" />
          </Field>
          <Field label="Phone">
            <input name="phone" defaultValue={u.phone ?? ""} className="input" />
          </Field>
          <Field label="Year joined Bilal Institute" className="sm:col-span-2">
            <select name="completionYear" defaultValue={u.completionYear ?? ""} className="input">
              <option value="">Select year</option>
              {completionYears().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <Submit className="btn-gold">Save</Submit>
          </div>
        </ActionForm>
      </div>
    );

  if (view === "notifications") {
    if (!member) return <p className="text-sm text-ivory/60">Match notifications are for members.</p>;
    const { rows } = await pool.query("select * from notification_preferences where user_id = $1", [u.id]);
    const p = rows[0];
    const prefs: Prefs = {
      match_reminders: p?.match_reminders ?? true,
      match_results: p?.match_results ?? true,
      goals: p?.goals ?? true,
      league_announcements: p?.league_announcements ?? true,
      team_updates: p?.team_updates ?? true,
      general_notifications: p?.general_notifications ?? true,
    };
    return <PushSettings publicKey={pushConfigured() ? vapidPublicKey() : null} prefs={prefs} />;
  }

  if (view === "player") {
    if (!u.player) return <p className="text-sm text-ivory/60">You are not registered as a player.</p>;
    const stats = (await getPlayerStats({ playerId: u.player.id, includePending: true }))[0];
    return (
      <div className="panel p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/15 font-display text-2xl text-gold">{u.player.number || "–"}</span>
          <div className="min-w-0 flex-1">
            <div className="font-serif text-2xl">
              {u.player.firstName} {u.player.lastName}
            </div>
            <div className="text-sm text-ivory/55">{u.team?.name}</div>
          </div>
          <Pill tone={u.player.status === "ACTIVE" ? "emerald" : u.player.status === "PENDING" ? "gold" : "crimson"}>{u.player.status === "PENDING" ? "Awaiting approval" : u.player.status}</Pill>
        </div>
        {stats && (
          <div className="mt-6 grid grid-cols-4 gap-3 text-center">
            {[
              ["Apps", stats.apps],
              ["Goals", stats.goals],
              ["Assists", stats.assists],
              ["POTM", stats.potm],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl border border-white/[0.06] p-3">
                <div className="font-display text-2xl">{v}</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-ivory/45">{l}</div>
              </div>
            ))}
          </div>
        )}
        {u.player.status !== "PENDING" && (
          <Link href={`/players/${u.player.id}`} className="mt-5 inline-block text-sm text-gold hover:underline">
            View my public profile
          </Link>
        )}
      </div>
    );
  }

  if (view === "payments") {
    const pays = await db.query.payments.findMany({ where: eq(payments.userId, u.id), orderBy: desc(payments.createdAt) });
    return (
      <div className="space-y-4">
        <div className="panel p-6">
          {member ? (
            <>
              <Pill tone="emerald">Membership active</Pill>
              {u.membershipPaidAt && <p className="mt-3 text-sm text-ivory/60">Member since {fmtLong(u.membershipPaidAt)}. Membership is one-time: nothing more to pay.</p>}
            </>
          ) : (
            <>
              <p className="text-sm text-ivory/65">Enter a membership voucher code to unlock the whole league.</p>
              <Link href="/membership" className="btn-gold mt-4">
                Activate membership
              </Link>
            </>
          )}
        </div>
        {pays.length > 0 && (
          <ul className="space-y-3">
            {pays.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold">{ugx(p.amount)}</div>
                  <div className="text-xs text-ivory/45">
                    {fmtDateTime(p.createdAt)} · {p.method ?? p.provider}
                  </div>
                </div>
                <Pill tone={p.status === "COMPLETED" ? "emerald" : p.status === "PENDING" ? "gold" : "crimson"}>{p.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <ActionForm action={changePasswordAction} className="space-y-4" resetOnSuccess>
        <Field label="Current password">
          <input name="current" type="password" autoComplete="current-password" className="input" required />
        </Field>
        <Field label="New password">
          <input name="next" type="password" autoComplete="new-password" minLength={8} className="input" required />
        </Field>
        <Submit className="btn-gold">Update password</Submit>
      </ActionForm>
    </div>
  );
}
