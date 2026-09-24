import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { ROLE_LABEL, homeFor } from "@/lib/roles";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  const headerUser = u
    ? { name: u.name, role: u.role, roleLabel: ROLE_LABEL[u.role], member: hasMembership(u), home: homeFor(u.role) }
    : null;
  return (
    <>
      <SiteHeader user={headerUser} />
      <main className="relative">{children}</main>
      <SiteFooter />
    </>
  );
}
