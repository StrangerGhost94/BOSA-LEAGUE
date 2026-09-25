import Link from "next/link";
import { BosaLogo } from "@/components/ui";
import { PARTNERS } from "@/lib/partners";

export function SiteFooter({ signedIn = false, member = false }: { signedIn?: boolean; member?: boolean }) {
  const memberLinks: [string, string][] = member
    ? [["Members' area", "/members"], ["My member card", "/members/card"], ["Member perks", "/members/perks"], ["My account", "/account"]]
    : signedIn
      ? [["Activate membership", "/membership"], ["Member perks", "/members/perks"], ["My account", "/account"]]
      : [["Become a member", "/membership"], ["Member perks", "/members/perks"], ["Sign in", "/sign-in"], ["Create account", "/sign-up"]];
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-white/[0.06] bg-night-900 xl:pb-[var(--safe-bottom)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(204,38,84,0.13),rgba(204,38,84,0))]" />
      <div className="container-x relative py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-4">
              <BosaLogo size={56} />
              <div>
                <div className="font-display text-2xl tracking-[0.12em]">BOSA LEAGUE</div>
                <div className="text-[10px] uppercase tracking-[0.34em] text-gold/80">Bilal Institute · Old Students</div>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ivory/50">
              Fourteen clubs, three competitions, one standard. Every Sunday at Henry's Pitch, Kabalagala, behind Shell Kabalagala.
            </p>
            <div className="mt-6 text-sm text-ivory/40">@bosaleague · #bosaleague</div>
          </div>
          <FooterCol title="Competitions" links={[["BOSA League", "/league"], ["Champions League", "/champions-league"], ["Super Cup", "/super-cup"], ["Rules", "/rules"]]} />
          <FooterCol title="Matchday" links={[["Fixtures & Results", "/fixtures"], ["Teams", "/teams"], ["Players", "/players"], ["Newsroom", "/news"]]} />
          <FooterCol title="Members" links={memberLinks} />
        </div>
        <div className="mt-14 border-t border-white/[0.06] pt-8">
          <div className="text-[10px] uppercase tracking-[0.3em] text-ivory/30">Official partners</div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 font-display text-sm uppercase tracking-[0.18em] text-ivory/45">
            {PARTNERS.map((p) =>
              p.url ? (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.linkLabel?.replace(/\u200B/g, "")}
                  className="inline-flex items-center gap-1 transition hover:text-gold"
                >
                  {p.name}
                  <svg width="9" height="9" viewBox="0 0 10 10" className="text-gold/60" aria-hidden>
                    <path d="M3 1h6v6M9 1 1 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </a>
              ) : (
                <span key={p.name}>{p.name}</span>
              ),
            )}
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
