import { PanelShell } from "@/components/panel-shell";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";

export const metadata = { title: { default: "Referee Desk", template: "%s · Referee Desk" } };

export default async function RefLayout({ children }: { children: React.ReactNode }) {
  const u = await requireRole(["REFEREE"], "/referee");
  return (
    <PanelShell title="REFEREE DESK" subtitle="BOSA League" user={{ name: u.name, role: ROLE_LABEL[u.role] }} nav={[{ section: "Officiating", items: [{ href: "/referee", label: "My appointments", icon: "whistle", exact: true }, { href: "/rules", label: "Rules", icon: "book" }] }]}>
      {children}
    </PanelShell>
  );
}
