import { PanelShell, type PanelNavItem } from "@/components/panel-shell";
import { requireRole } from "@/lib/auth";
import { CONTROL_ROOM_ROLES, ROLE_LABEL, can, type Permission } from "@/lib/roles";
import { pool } from "@/db";
import { expireStatuses } from "@/lib/data";
import { tickSeasonEngine } from "@/lib/season-engine";
import { countSharingFlags } from "@/lib/security";

export const metadata = { title: { default: "Control Room", template: "%s · BOSA Control Room" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireRole(CONTROL_ROOM_ROLES, "/admin");
  await expireStatuses();
  await tickSeasonEngine();
  const { rows } = await pool.query(
    "select (select count(*) from players where status='PENDING')::int pending, (select count(*) from team_applications where status='PENDING')::int apps, (select count(*) from matches where status in ('LIVE','HALF_TIME'))::int live",
  );
  const c = rows[0] as { pending: number; apps: number; live: number };
  const sharing = can(u.role, "sharing") ? await countSharingFlags() : 0;
  const item = (perm: Permission, i: PanelNavItem) => (can(u.role, perm) ? [i] : []);
  const nav = [
    { section: "Matchday", items: [{ href: "/admin", label: "Overview", icon: "grid" as const, exact: true }, ...item("fixtures", { href: "/admin/fixtures", label: "Fixtures & results", icon: "calendar", badge: c.live }), ...item("results", { href: "/admin/live", label: "Live desk", icon: "activity" }), ...item("competitions", { href: "/admin/season", label: "Season control", icon: "trophy" })] },
    {
      section: "Competition",
      items: [
        ...item("competitions", { href: "/admin/competitions", label: "Competitions & seasons", icon: "trophy" }),
        ...item("teams", { href: "/admin/teams", label: "Teams", icon: "shield" }),
        ...item("players", { href: "/admin/players", label: "Players", icon: "users", badge: c.pending }),
        ...item("rules", { href: "/admin/rules", label: "Rules", icon: "book" }),
      ],
    },
    {
      section: "Publishing",
      items: [...item("news", { href: "/admin/news", label: "Newsroom", icon: "news" }), ...item("news", { href: "/admin/notifications", label: "Notifications", icon: "bell" }), ...item("news", { href: "/admin/gallery", label: "Gallery", icon: "grid" })],
    },
    {
      section: "Administration",
      items: [
        ...item("users", { href: "/admin/users", label: u.role === "SUPER_ADMIN" ? "Users & roles" : "Coaches & officials", icon: "user" }),
        ...item("sharing", { href: "/admin/security", label: "Account sharing", icon: "shield", badge: sharing }),
        ...item("payments", { href: "/admin/vouchers", label: "Vouchers", icon: "card" }),
        ...item("payments", { href: "/admin/payments", label: "Memberships", icon: "users" }),
        ...item("perks", { href: "/admin/perks", label: "Member perks", icon: "sparkle" }),
        ...item("exports", { href: "/admin/exports", label: "Reports & exports", icon: "download" }),
        ...item("activity", { href: "/admin/activity", label: "Activity history", icon: "activity" }),
        ...item("fixtures", { href: "/admin/settings", label: "Settings & venues", icon: "settings" }),
      ],
    },
  ].filter((g) => g.items.length);
  return (
    <PanelShell title="CONTROL ROOM" subtitle="BOSA League" nav={nav} user={{ name: u.name, role: ROLE_LABEL[u.role] }}>
      {children}
    </PanelShell>
  );
}
