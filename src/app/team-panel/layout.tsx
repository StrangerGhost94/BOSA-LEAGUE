import { PanelShell } from "@/components/panel-shell";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { expireStatuses } from "@/lib/data";

export const metadata = { title: { default: "Club Panel", template: "%s · Club Panel" } };

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const u = await requireRole(["TEAM_MANAGER"], "/team-panel");
  await expireStatuses();
  return (
    <PanelShell
      title={(u.team?.name ?? "CLUB").toUpperCase()}
      subtitle="Club panel"
      user={{ name: u.name, role: ROLE_LABEL[u.role] }}
      nav={[
        { section: "My club", items: [
          { href: "/team-panel", label: "Overview", icon: "grid", exact: true },
          { href: "/team-panel/squad", label: "Squad & availability", icon: "users" },
          { href: "/team-panel/matches", label: "Fixtures & team sheets", icon: "calendar" },
          { href: "/team-panel/club", label: "Club profile", icon: "shield" },
        ] },
        { section: "Public", items: [{ href: u.team ? `/teams/${u.team.slug}` : "/teams", label: "Club page", icon: "home" }, { href: "/league", label: "League table", icon: "trophy" }] },
      ]}
    >
      {children}
    </PanelShell>
  );
}
