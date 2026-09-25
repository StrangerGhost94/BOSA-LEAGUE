import { requirePermission } from "@/lib/auth";
import { LiveDeskMatchView } from "@/components/live-desk/match-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live desk" };

export default async function AdminLiveDeskMatch({ params }: { params: { id: string } }) {
  await requirePermission("results");
  return (
    <div className="mx-auto max-w-xl">
      <LiveDeskMatchView id={params.id} base="/admin/live" />
    </div>
  );
}
