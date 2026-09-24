import Link from "next/link";
import { BosaLogo } from "@/components/ui";

export function SiteFooter() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-white/[0.06] bg-night-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[800px] -translate-x-1/2 rounded-full bg-crimson/10 blur-[120px]" />
      <div className="container-x relative py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              <BosaLogo size={56} />
              <div>
                <div className="font-display text-2xl tracking-[0.12em]">BOSA LEAGUE</div>
                <div className="text-[10px] uppercase tracking-[0.34em] text-gold/80">Students · Alumni · Since 2023</div>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ivory/50">
              Fourteen clubs, three competitions, one standard. Every Sunday at Henry's Pitch, Kabalagala, behind Shell Kabalagala.
            </p>
            <div className="mt-6 text-sm text-ivory/40">@bosaleague · #bosaleague</div>
          </div>
          <FooterCol title="Competitions" links={[["BOSA League", "/league"], ["Champions League", "/champions-league"], ["Super League", "/super-league"], ["Rules", "/rules"]]} />
          <FooterCol title="Matchday" links={[["Fixtures & Results", "/fixtures"], ["Teams", "/teams"], ["Players", "/players"], ["Newsroom", "/news"]]} />
          <FooterCol title="Members" links={[["Become a member", "/membership"], ["Sign in", "/sign-in"], ["Create account", "/sign-up"], ["My account", "/account"]]} />
        </div>
        <div className="mt-14 border-t border-white/[0.06] pt-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-ivory/30">Official partners</div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 font-display text-sm uppercase tracking-[0.18em] text-ivory/45">
            <span>Bilal Islamic Institute</span>
            <span>Weli Travel</span>
            <span>SondeStone Hardware</span>
            <span>Plasma Designs Atlantis</span>
            <span>Hannan Petroleum</span>
            <span>Daherz Family Doctors</span>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-4 text-xs text-ivory/30">
          <span>© {new Date().getFullYear()} BOSA League. All rights reserved.</span>
          <span>Henry's Pitch · Kabalagala · Kampala</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="eyebrow mb-5">{title}</div>
      <ul className="space-y-3">
        {links.map(([l, h]) => (
          <li key={h}>
            <Link href={h} className="text-sm text-ivory/60 transition hover:text-ivory">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
