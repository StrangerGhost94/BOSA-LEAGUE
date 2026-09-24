import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { ROLE_LABEL, homeFor } from "@/lib/roles";
import { pool } from "@/db";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [u, live] = await Promise.all([getCurrentUser(), pool.query("select count(*)::int c from matches where status in ('LIVE','HALF_TIME')")]);
  const headerUser = u
    ? { name: u.name, role: u.role, roleLabel: ROLE_LABEL[u.role], member: hasMembership(u), home: homeFor(u.role) }
    : null;
  return (
    <>
      <SiteHeader user={headerUser} liveCount={live.rows[0].c} />
      <main className="relative">{children}</main>
      <SiteFooter />
    </>
  );
}
