import Link from "next/link";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { db } from "@/db";
import { perks } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { FadeIn, RevealText, Stagger, StaggerItem } from "@/components/motion";
import { Icon } from "@/components/ui";
import { StadiumBackdrop } from "@/components/site/stadium";
import { ugx } from "@/lib/format";

export const metadata = { title: "Members" };

const FEATURES = [
  { href: "/live", icon: "activity" as const, t: "Live match centre", d: "Follow every Sunday game minute by minute on your phone: goals, cards and substitutions as they happen, with scores that update by themselves." },
  { href: "/members/perks", icon: "sparkle" as const, t: "Member perks", d: "Discounts and offers from BOSA League partners. Show your member card at the counter to claim them.", open: true },
  { href: "/members/card", icon: "card" as const, t: "Digital member card", d: "Your BOSA card with your name, intake year and member number. Partners scan its QR code to confirm you are a member." },
  { href: "/vote", icon: "trophy" as const, t: "Vote", d: "Choose the fans' player of the match after every game, and the player of the month." },
  { href: "/gallery", icon: "grid" as const, t: "Photos and highlights", d: "Members-only photo albums and video highlights from every matchday at Henry's Pitch." },
  { href: "/fixtures", icon: "calendar" as const, t: "Early access", d: "See the next matchday's fixtures and team news before they are published to everyone." },
  { href: "/players", icon: "users" as const, t: "Full match and player detail", d: "Line-ups, match timelines, reports and complete player profiles." },
];

export default async function MembersPage() {
  const [u, price, offers] = await Promise.all([getCurrentUser(), getMembershipPrice(), db.query.perks.findMany({ where: eq(perks.active, true), orderBy: asc(perks.order) })]);
  const member = hasMembership(u);
  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-36">
        <StadiumBackdrop intensity={0.8} />
        <div className="container-x relative">
          <div className="eyebrow">{member ? `Welcome, ${u!.name.split(" ")[0]}` : "BOSA League membership"}</div>
          <h1 className="headline mt-6 text-5xl sm:text-7xl">
            <RevealText text={member ? "Your members' area." : "More than the score."} />
          </h1>
          <FadeIn delay={0.3}>
            <p className="mt-6 max-w-xl text-ivory/65">
              {member ? "Everything your membership unlocks, in one place." : `One payment of ${ugx(price)} unlocks everything below for the whole season. For Bilal Institute old students.`}
            </p>
            {!member && (
              <Link href="/membership" className="btn-gold mt-8 px-7 py-3">
                Become a member
              </Link>
            )}
          </FadeIn>
        </div>
      </section>
      <section className="container-x">
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.t}>
              <Link href={member || f.open ? f.href : "/membership"} className="panel group flex h-full flex-col p-6 transition hover:-translate-y-1 hover:border-gold/30">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold">
                  <Icon name={f.icon} size={22} />
                </span>
                <h2 className="mt-5 font-serif text-2xl group-hover:text-gold-300">{f.t}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ivory/55">{f.d}</p>
                <span className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-gold">
                  {member ? "Open" : f.open ? "See the offers" : <><Icon name="lock" size={13} /> Members</>} <Icon name="arrowRight" size={14} />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
        {offers.length > 0 && (
          <div className="mt-16">
            <div className="eyebrow mb-5">Partner offers for members</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((o) => (
                <div key={o.id} className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.07] to-transparent p-5">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-gold">{o.sponsor}</div>
                  <div className="mt-2 font-serif text-xl">{o.offer}</div>
                  {o.details && <p className="mt-2 text-sm text-ivory/55">{o.details}</p>}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ivory/40">Show your digital member card to claim. Partners can check a card by scanning its QR code.</p>
          </div>
        )}
      </section>
    </>
  );
}
