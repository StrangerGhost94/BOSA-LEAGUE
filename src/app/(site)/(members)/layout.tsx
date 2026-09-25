import Link from "next/link";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { ugx } from "@/lib/format";
import { Icon } from "@/components/ui";

/**
 * Everything in this folder (tables, fixtures, results, clubs, players, news, gallery, votes, rules)
 * is for members. Staff count as members. Everyone else sees a friendly invitation to join.
 * The URLs are unchanged: a (group) folder does not appear in the address.
 */
export default async function MembersOnlyLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (hasMembership(u)) return <>{children}</>;
  const price = await getMembershipPrice();
  const perks = [
    { icon: "activity" as const, t: "Live scores and the full match centre" },
    { icon: "list" as const, t: "Tables, fixtures and results for all three competitions" },
    { icon: "users" as const, t: "Every club, player and goal" },
    { icon: "bell" as const, t: "Goal alerts and kick-off reminders on your phone" },
    { icon: "card" as const, t: "Your digital member card and partner perks" },
  ];
  return (
    <section className="container-x pb-16 pt-28 sm:pb-24 sm:pt-36">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-b from-gold/[0.08] to-transparent px-6 py-10 text-center sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(214,182,118,0.25),rgba(214,182,118,0))]" />
        <div className="relative eyebrow">BOSA League membership</div>
        <h1 className="relative mt-4 font-serif text-3xl leading-tight sm:text-5xl">
          Follow every match, <em className="gold-text">all season</em>
        </h1>
        <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-ivory/65 sm:text-base">
          Join the old students of Bilal Institute backing their intake every Sunday. One membership opens up the whole league.
        </p>
        <ul className="relative mx-auto mt-8 max-w-sm space-y-3 text-left text-sm">
          {perks.map((p) => (
            <li key={p.t} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold/30 text-gold">
                <Icon name={p.icon} size={15} />
              </span>
              <span className="text-ivory/85">{p.t}</span>
            </li>
          ))}
        </ul>
        <div className="relative mt-8 font-display text-2xl text-gold">{ugx(price)}</div>
        <div className="relative text-xs text-ivory/50">One payment. Yours for good.</div>
        <div className="relative mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/membership" className="btn-gold w-full px-8 sm:w-auto">
            {u ? "Activate my membership" : "Become a member"}
          </Link>
          <Link href={u ? "/members/perks" : "/sign-in"} className="btn-ghost w-full sm:w-auto">
            {u ? "See member perks" : "Already a member? Sign in"}
          </Link>
        </div>
      </div>
    </section>
  );
}
