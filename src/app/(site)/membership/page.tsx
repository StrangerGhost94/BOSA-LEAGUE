import Link from "next/link";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { pesapalConfigured } from "@/lib/pesapal";
import { ugx, fmtLong } from "@/lib/format";
import { StadiumBackdrop } from "@/components/site/stadium";
import { FadeIn, RevealText } from "@/components/motion";
import { ActionForm, Field, Submit } from "@/components/form";
import { redeemVoucherAction, startPaymentAction } from "@/app/actions/membership";
import { BosaLogo, Icon } from "@/components/ui";

export const metadata = { title: "Membership" };

const BENEFITS = [
  "Live match centre: follow every Sunday game minute by minute, with scores that update by themselves",
  "Member perks: discounts from BOSA League partners with your digital member card",
  "Vote for the fans' player of the match and the player of the month",
  "Members-only photo albums and video highlights from every matchday",
  "Early access to fixtures and team news before everyone else",
  "Full match timelines, line-ups, reports and player profiles",
];

export default async function MembershipPage({ searchParams }: { searchParams: { success?: string; welcome?: string; voucher?: string } }) {
  const [user, price] = await Promise.all([getCurrentUser(), getMembershipPrice()]);
  const member = hasMembership(user);
  const live = pesapalConfigured();

  return (
    <section className="relative min-h-screen overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36">
      <StadiumBackdrop intensity={0.8} />
      <div className="container-x relative grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="eyebrow">BOSA League membership</div>
          <h1 className="headline mt-6 text-6xl sm:text-7xl lg:text-8xl">
            <RevealText text="Pay once." />
            <br />
            <RevealText text="Belong for good." className="gold-text italic" delay={0.2} />
          </h1>
          <FadeIn delay={0.4}>
            <ul className="mt-10 space-y-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-4 text-ivory/75">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <Icon name="check" size={13} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/members/perks" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold hover:text-gold-300">
              See the member perks <Icon name="arrowRight" size={14} />
            </Link>
          </FadeIn>
        </div>

        <FadeIn delay={0.3} className="order-first lg:order-none">
          <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8 shadow-[0_50px_120px_-40px_rgba(0,0,0,.9)] sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(204,38,84,0.39),rgba(204,38,84,0))]" />
            <div className="relative flex items-center justify-between">
              <BosaLogo size={56} />
              <span className="chip border-gold/40 text-gold">One-time</span>
            </div>
            {searchParams.welcome && !member && <p className="relative mt-6 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm text-emerald-400">Welcome to BOSA League. Activate your membership to unlock everything.</p>}
            {member ? (
              <div className="relative mt-8">
                <div className="font-serif text-4xl">You are a member.</div>
                <p className="mt-3 text-ivory/60">
                  {searchParams.success ? "Membership activated. " : ""}
                  {user?.membershipPaidAt ? `Active since ${fmtLong(user.membershipPaidAt)}.` : "Your account has full access."}
                </p>
                <div className="mt-8 flex gap-3">
                  <Link href="/fixtures" className="btn-gold">Go to the match centre</Link>
                  <Link href="/account" className="btn-ghost">My account</Link>
                </div>
              </div>
            ) : (
              <div className="relative mt-8">
                <div className="text-[11px] uppercase tracking-[0.24em] text-ivory/50">Full season access</div>
                <div className="mt-2 font-display text-6xl">
                  <span className="gold-text">{ugx(price)}</span>
                </div>
                <div className="mt-2 text-sm text-ivory/55">Paid once with a membership voucher. No renewals, no hidden fees.</div>
                {user ? (
                  <div className="mt-8 space-y-6">
                    {searchParams.voucher && <p className="rounded-xl border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson-400">Your account was created, but the voucher did not work: {searchParams.voucher}</p>}
                    <ActionForm action={redeemVoucherAction} className="space-y-4" toast={false}>
                      <Field label="Membership voucher code">
                        <input
                          name="voucher"
                          className="input text-center font-mono text-lg uppercase tracking-[0.18em]"
                          placeholder="BOSA-XXXX-XXXX"
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          required
                        />
                      </Field>
                      <Submit className="btn-primary w-full py-3.5" pendingText="Checking your voucher">
                        Activate membership
                      </Submit>
                      <p className="text-center text-xs text-ivory/50">Buy a voucher for {ugx(price)} from the League office or a club manager at Henry&apos;s Pitch. Each code works once.</p>
                    </ActionForm>
                    {live && (
                      <ActionForm action={startPaymentAction} className="space-y-4 border-t border-white/[0.08] pt-6" toast={false}>
                        <div className="text-center text-[11px] uppercase tracking-[0.2em] text-ivory/45">Or pay online</div>
                        <Field label="Mobile Money number (optional)">
                          <input name="phone" defaultValue={user.phone ?? ""} className="input" placeholder="07XX XXX XXX" />
                        </Field>
                        <Submit className="btn-ghost w-full py-3.5" pendingText="Connecting to Pesapal">
                          Pay securely with Pesapal
                        </Submit>
                      </ActionForm>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 space-y-3">
                    <p className="text-sm text-ivory/60">Have a voucher? Enter it when you create your account and your membership starts straight away.</p>
                    <Link href="/sign-up" className="btn-primary w-full py-3.5">Create an account</Link>
                    <Link href="/sign-in?next=/membership" className="btn-ghost w-full py-3.5">I already have an account</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
