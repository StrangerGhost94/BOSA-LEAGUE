import { requirePermission } from "@/lib/auth";
import { LiveDeskList } from "@/components/live-desk/list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live desk" };

/** The Live Desk inside the Control Room, for admins who step in during a match. */
export default async function AdminLiveDesk() {
  await requirePermission("results");
  return (
    <div className="mx-auto max-w-xl">
      <LiveDeskList base="/admin/live" />
    </div>
  );
}
