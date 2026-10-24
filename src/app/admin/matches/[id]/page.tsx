import { MatchConsole } from "@/components/admin/match-console";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "Match console" };

export default async function AdminMatch(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requirePermission("results");
  return <MatchConsole id={params.id} mode="admin" />;
}
