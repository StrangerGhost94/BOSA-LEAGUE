import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MobileTabBar } from "@/components/site/tab-bar";
import { SignedOutNotice } from "@/components/site/signed-out-notice";
import { getSessionState, hasMembership } from "@/lib/auth";
import { ROLE_LABEL, homeFor } from "@/lib/roles";
import { pool } from "@/db";
import { tickSeasonEngine } from "@/lib/season-engine";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await tickSeasonEngine();
  const [session, live] = await Promise.all([
    getSessionState(),
    pool.query("select count(*)::int c from matches where status in ('LIVE','HALF_TIME')"),
  ]);
  const u = session.user;
  const headerUser = u
    ? { name: u.name, role: u.role, roleLabel: ROLE_LABEL[u.role], member: hasMembership(u), home: homeFor(u.role) }
    : null;
  return (
    <>
      <SiteHeader user={headerUser} liveCount={live.rows[0].c} />
      <main className="relative pt-[var(--safe-top)]">
        {session.superseded && <SignedOutNotice />}
        {children}
      </main>
      <MobileTabBar liveCount={live.rows[0].c} />
      <SiteFooter signedIn={!!u} member={hasMembership(u)} />
      <div className="h-[calc(var(--tabbar-h)+var(--safe-bottom))] xl:hidden" aria-hidden />
    </>
  );
}
