import { PageHeader } from "@/components/panel-shell";
import { Icon } from "@/components/ui";
import { getSeasonsForAdmin } from "@/lib/data";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "Reports & exports" };

export default async function Exports() {
  await requirePermission("exports");
  const seasons = (await getSeasonsForAdmin()).filter((s) => s.isCurrent);
  const card = (href: string, title: string, body: string) => (
    <a key={href} href={href} className="panel group flex items-start gap-4 p-5 transition hover:border-gold/30">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
        <Icon name="download" />
      </span>
      <span>
        <span className="block font-semibold group-hover:text-gold">{title}</span>
        <span className="text-sm text-ivory/50">{body}</span>
      </span>
    </a>
  );
  return (
    <>
      <PageHeader eyebrow="CSV downloads open in Excel or Google Sheets" title="Reports & exports" />
      <div className="grid gap-4 md:grid-cols-2">
        {seasons.map((s) => card(`/api/export/standings?season=${s.id}`, `${s.competition.name} standings`, `${s.name} table with form, goals and points`))}
        {seasons.map((s) => card(`/api/export/fixtures?season=${s.id}`, `${s.competition.name} fixtures and results`, `Every match in ${s.name}`))}
        {card("/api/export/players", "Player statistics", "All registered players with goals, assists, cards and appearances")}
        {card("/api/export/members", "Members and payments", "Accounts with membership status and payment dates")}
        {card("/api/export/activity", "Activity history", "Full audit trail of administrative actions")}
      </div>
    </>
  );
}
