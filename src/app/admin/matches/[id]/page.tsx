import { MatchConsole } from "@/components/admin/match-console";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "Match console" };

export default async function AdminMatch({ params }: { params: { id: string } }) {
  await requirePermission("results");
  return <MatchConsole id={params.id} mode="admin" />;
}
