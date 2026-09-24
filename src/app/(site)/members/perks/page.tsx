import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { perks } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { can } from "@/lib/roles";
import { PARTNERS } from "@/lib/partners";
import { ugx } from "@/lib/format";
import { MembersNav } from "@/components/members-nav";
import { FadeIn, RevealText, Stagger, StaggerItem } from "@/components/motion";
import { Icon } from "@/components/ui";
import { StadiumBackdrop } from "@/components/site/stadium";

export const metadata = { title: "Member perks" };

export default async function PerksPage() {
  const [u, price, offers] = await Promise.all([getCurrentUser(), getMembershipPrice(), db.query.perks.findMany({ where: eq(perks.active, true), orderBy: asc(perks.order) })]);
  const member = hasMembership(u);
  return (
    <>
      <section className="relative overflow-hidden pb-10 pt-28 sm:pt-36">
        <StadiumBackdrop intensity={0.7} />
        <div className="container-x relative">
          {member && <MembersNav active="/members/perks" />}
          <div className="eyebrow mt-8">Member perks</div>
          <h1 className="headline mt-5 text-5xl sm:text-7xl">
            <RevealText text="Your card pays back." />
          </h1>
          <FadeIn delay={0.25}>
            <p className="mt-5 max-w-xl text-ivory/65">
              Discounts and offers from BOSA League partners, for members only. Show your digital member card at the counter; partners can check it by scanning its QR code.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {member ? (
                <Link href="/members/card" className="btn-gold px-6 py-3">
                  <Icon name="card" size={16} /> Show my member card
                </Link>
              ) : (
                <Link href="/membership" className="btn-gold px-6 py-3">
                  Become a member · {ugx(price)}
                </Link>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="container-x">
        {offers.length ? (
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {offers.map((o) => (
              <StaggerItem key={o.id}>
                <div className="relative h-full overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.09] via-night-800/60 to-transparent p-6">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(closest-side,rgba(214,182,118,0.13),rgba(214,182,118,0))]" />
                  <div className="text-[11px] uppercase tracking-[0.2em] text-gold">{o.sponsor}</div>
                  <div className="mt-3 font-serif text-2xl leading-snug">{o.offer}</div>
                  {o.details && <p className="mt-3 text-sm leading-relaxed text-ivory/55">{o.details}</p>}
                  {!member && (
                    <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-gold">
                      <Icon name="lock" size={12} /> Members only
                    </div>
                  )}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="rounded-3xl border border-dashed border-gold/25 p-6 sm:p-10">
            <div className="font-serif text-2xl">Partner offers are on the way</div>
            <p className="mt-2 max-w-xl text-sm text-ivory/55">The League office is agreeing member offers with our partners. They will appear here, and on your member card, as soon as they are confirmed.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {PARTNERS.map((p) => (
                <span key={p} className="chip text-ivory/70">
                  {p}
                </span>
              ))}
            </div>
            {u && can(u.role, "payments") && (
              <Link href="/admin/perks" className="btn-ghost btn-sm mt-6">
                Add an offer in the Control Room
              </Link>
            )}
          </div>
        )}

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "Become a member", d: `A single payment of ${ugx(price)} for Bilal Institute old students.` },
            { n: "02", t: "Open your card", d: "Your digital member card is in Members, with your name, intake year and member number." },
            { n: "03", t: "Show it at the counter", d: "The partner scans the QR code to confirm your membership, then applies the offer." },
          ].map((s) => (
            <div key={s.n} className="panel p-6">
              <div className="font-display text-3xl text-gold/50">{s.n}</div>
              <div className="mt-3 font-serif text-xl">{s.t}</div>
              <p className="mt-2 text-sm text-ivory/55">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
