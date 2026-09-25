import { LiveDeskMatchView } from "@/components/live-desk/match-view";

export const dynamic = "force-dynamic";

export default function LiveDeskMatch({ params }: { params: { id: string } }) {
  return <LiveDeskMatchView id={params.id} base="/live-desk" />;
}
