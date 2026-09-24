import Link from "next/link";
import { BosaLogo } from "@/components/ui";
import { StadiumBackdrop } from "@/components/site/stadium";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/[0.06] lg:block">
        <StadiumBackdrop />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <BosaLogo size={46} />
            <span className="font-display text-xl tracking-[0.14em]">BOSA LEAGUE</span>
          </Link>
          <div>
            <div className="eyebrow mb-5">Members' entrance</div>
            <h1 className="headline max-w-lg text-6xl xl:text-7xl">
              The pitch is <em className="gold-text not-italic">yours</em> this Sunday.
            </h1>
            <p className="mt-6 max-w-md text-ivory/60">
              One membership, the whole season. Full match centre, player profiles, members-only stories and the best seat at Henry's Pitch.
            </p>
          </div>
          <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.24em] text-ivory/40">
            <span>14 clubs</span>
            <span className="h-px w-8 bg-gold/40" />
            <span>3 competitions</span>
            <span className="h-px w-8 bg-gold/40" />
            <span>1 crown</span>
          </div>
        </div>
      </aside>
      <section className="relative flex items-center justify-center pb-[calc(4rem+var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-[calc(4rem+var(--safe-top))] sm:pl-[max(2rem,var(--safe-left))] sm:pr-[max(2rem,var(--safe-right))]">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(204,38,84,0.13),rgba(204,38,84,0))]" />
        <div className="relative w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
            <BosaLogo size={40} />
            <span className="font-display text-lg tracking-[0.14em]">BOSA LEAGUE</span>
          </Link>
          {children}
        </div>
      </section>
    </div>
  );
}
