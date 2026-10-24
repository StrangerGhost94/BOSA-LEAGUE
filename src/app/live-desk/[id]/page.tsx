import { LiveDeskMatchView } from "@/components/live-desk/match-view";

export const dynamic = "force-dynamic";

export default async function LiveDeskMatch(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <LiveDeskMatchView id={params.id} base="/live-desk" />;
}
