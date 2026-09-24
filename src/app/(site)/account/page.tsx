import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireUser, hasMembership } from "@/lib/auth";
import { ROLE_LABEL, homeFor } from "@/lib/roles";
import { fmtDateTime, fmtLong, ugx } from "@/lib/format";
import { ActionForm, Field, Submit } from "@/components/form";
import { changePasswordAction, updateProfileAction } from "@/app/actions/account";
import { Crest, Pill, SectionHeading } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { getPlayerStats } from "@/lib/data";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const u = await requireUser("/account");
  const member = hasMembership(u);
  const pays = await db.query.payments.findMany({ where: eq(payments.userId, u.id), orderBy: desc(payments.createdAt) });
  const stats = u.playerId ? (await getPlayerStats({ playerId: u.playerId, includePending: true }))[0] : null;
  const panel = homeFor(u.role);

  return (
    <section className="container-x pt-36">
      <FadeIn>
        <div className="eyebrow">{ROLE_LABEL[u.role]}</div>
        <h1 className="headline mt-4 text-5xl sm:text-7xl">{u.name}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {member ? <Pill tone="emerald">Membership active</Pill> : <Pill tone="crimson">Membership inactive</Pill>}
          {u.team && (
            <span className="flex items-center gap-2 text-sm text-ivory/60">
              <Crest team={u.team} size={24} /> {u.team.name}
            </span>
          )}
          {panel !== "/account" && (
            <Link href={panel} className="btn-gold btn-sm">
              Open my control panel
            </Link>
          )}
        </div>
      </FadeIn>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8">
          {!member && (
            <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent p-6">
              <div className="font-serif text-2xl">Activate your membership</div>
              <p className="mt-1 text-sm text-ivory/60">One payment unlocks the full match centre, player profiles and members-only stories.</p>
              <Link href="/membership" className="btn-gold mt-5">Activate now</Link>
            </div>
          )}
          {u.player && (
            <div className="panel p-6">
              <div className="eyebrow mb-4">My player registration</div>
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/15 font-display text-2xl text-gold">{u.player.number}</span>
                <div className="flex-1">
                  <div className="font-serif text-2xl">
                    {u.player.firstName} {u.player.lastName}
                  </div>
                  <div className="text-sm text-ivory/55">{u.team?.name}</div>
                </div>
                <Pill tone={u.player.status === "ACTIVE" ? "emerald" : u.player.status === "PENDING" ? "gold" : "crimson"}>{u.player.status === "PENDING" ? "Awaiting approval" : u.player.status}</Pill>
              </div>
              {stats && (
                <div className="mt-6 grid grid-cols-4 gap-3 text-center">
                  {[["Apps", stats.apps], ["Goals", stats.goals], ["Assists", stats.assists], ["POTM", stats.potm]].map(([l, v]) => (
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
          )}
          <div className="panel p-6">
            <SectionHeading title={<span className="text-2xl sm:text-3xl">Profile</span>} className="mb-4" />
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
              <Field label="University or institute" className="sm:col-span-2">
                <input name="university" defaultValue={u.university ?? ""} className="input" />
              </Field>
              <div>
                <Submit className="btn-gold">Save profile</Submit>
              </div>
            </ActionForm>
          </div>
        </div>
        <div className="space-y-8">
          <div className="panel p-6">
            <div className="eyebrow mb-4">Payments</div>
            {pays.length === 0 && <p className="text-sm text-ivory/45">No payments yet.</p>}
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
            {u.membershipPaidAt && <p className="mt-4 text-xs text-ivory/45">Member since {fmtLong(u.membershipPaidAt)}</p>}
          </div>
          <div className="panel p-6">
            <div className="eyebrow mb-4">Change password</div>
            <ActionForm action={changePasswordAction} className="space-y-4" resetOnSuccess>
              <Field label="Current password">
                <input name="current" type="password" className="input" required />
              </Field>
              <Field label="New password">
                <input name="next" type="password" minLength={8} className="input" required />
              </Field>
              <Submit className="btn-ghost">Update password</Submit>
            </ActionForm>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <button className="btn-danger w-full">Sign out</button>
          </form>
        </div>
      </div>
    </section>
  );
}
