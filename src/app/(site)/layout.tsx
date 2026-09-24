import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MobileTabBar } from "@/components/site/tab-bar";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { ROLE_LABEL, homeFor } from "@/lib/roles";
import { pool } from "@/db";
import { tickSeasonEngine } from "@/lib/season-engine";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  await tickSeasonEngine();
  const [u, live, season] = await Promise.all([
    getCurrentUser(),
    pool.query("select count(*)::int c from matches where status in ('LIVE','HALF_TIME')"),
    pool.query("select s.name, s.year from seasons s join competitions c on c.id=s.competition_id where c.type='LEAGUE' and s.is_current order by s.year desc limit 1"),
  ]);
  const seasonLabel = season.rows[0] ? `${season.rows[0].name} · ${season.rows[0].year}` : "";
  const headerUser = u
    ? { name: u.name, role: u.role, roleLabel: ROLE_LABEL[u.role], member: hasMembership(u), home: homeFor(u.role) }
    : null;
  return (
    <>
      <SiteHeader user={headerUser} liveCount={live.rows[0].c} seasonLabel={seasonLabel} />
      <main className="relative">{children}</main>
      <MobileTabBar liveCount={live.rows[0].c} />
      <SiteFooter />
      <div className="h-[calc(56px+env(safe-area-inset-bottom))] xl:hidden" aria-hidden />
    </>
  );
}
