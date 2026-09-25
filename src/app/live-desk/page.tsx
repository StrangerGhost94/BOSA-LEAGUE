import { LiveDeskList } from "@/components/live-desk/list";

export const dynamic = "force-dynamic";

export default function LiveDeskHome() {
  return <LiveDeskList base="/live-desk" />;
}
