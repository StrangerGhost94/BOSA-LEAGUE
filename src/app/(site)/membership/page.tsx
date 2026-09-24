import Link from "next/link";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { pesapalConfigured, demoPaymentsEnabled } from "@/lib/pesapal";
import { ugx, fmtLong } from "@/lib/format";
import { StadiumBackdrop } from "@/components/site/stadium";
import { FadeIn, RevealText } from "@/components/motion";
import { ActionForm, Field, Submit } from "@/components/form";
import { startPaymentAction } from "@/app/actions/membership";
import { BosaLogo, Icon } from "@/components/ui";

export const metadata = { title: "Membership" };

const BENEFITS = [
  "Full match centre: timelines, line-ups and match reports",
  "Complete player profiles and goal involvement history",
  "Members-only interviews and editorial features",
  "Player-of-the-match awards and advanced statistics",
  "Support the referees, pitch hire and medical cover that keep BOSA running",
];

export default async function MembershipPage({ searchParams }: { searchParams: { success?: string; welcome?: string } }) {
  const [user, price] = await Promise.all([getCurrentUser(), getMembershipPrice()]);
  const member = hasMembership(user);
  const live = pesapalConfigured();
  const demo = demoPaymentsEnabled();

  return (
    <section className="relative min-h-screen overflow-hidden pb-24 pt-36">
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
          </FadeIn>
        </div>

        <FadeIn delay={0.3}>
          <div className="glass relative overflow-hidden rounded-[2rem] p-8 shadow-[0_50px_120px_-40px_rgba(0,0,0,.9)] sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-crimson/30 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <BosaLogo size={56} />
              <span className="chip border-gold/40 text-gold">One-time</span>
            </div>
            {searchParams.welcome && !member && <p className="relative mt-6 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm text-emerald-400">Welcome to BOSA League. Activate your membership to unlock everything.</p>}
            {member ? (
              <div className="relative mt-8">
                <div className="font-serif text-4xl">You are a member.</div>
                <p className="mt-3 text-ivory/60">
                  {searchParams.success ? "Payment confirmed. " : ""}
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
                <div className="mt-2 text-sm text-ivory/55">Paid once. No renewals, no hidden fees.</div>
                {user ? (
                  <ActionForm action={startPaymentAction} className="mt-8 space-y-4" toast={false}>
                    <Field label="Mobile Money number (optional)">
                      <input name="phone" defaultValue={user.phone ?? ""} className="input" placeholder="07XX XXX XXX" />
                    </Field>
                    <Submit className="btn-primary w-full py-3.5" pendingText="Connecting to Pesapal">
                      {live ? "Pay securely with Pesapal" : demo ? "Activate (demo payment)" : "Pay securely with Pesapal"}
                    </Submit>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.16em] text-ivory/40">
                      <span>MTN MoMo</span>
                      <span>Airtel Money</span>
                      <span>Visa</span>
                      <span>Mastercard</span>
                    </div>
                    {!live && demo && <p className="text-center text-xs text-gold/80">Demo mode: Pesapal keys are not set, so this activates membership without charging.</p>}
                  </ActionForm>
                ) : (
                  <div className="mt-8 space-y-3">
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
