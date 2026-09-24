import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getAlbumMedia } from "@/lib/gallery";
import { Lightbox } from "@/components/lightbox";
import { EmptyState, Icon } from "@/components/ui";
import { fmtLong } from "@/lib/format";

export default async function AlbumPage({ params }: { params: { id: string } }) {
  const u = await getCurrentUser();
  if (!hasMembership(u)) redirect("/membership");
  const a = await db.query.albums.findFirst({ where: eq(albums.id, params.id) });
  if (!a || (!a.published && !["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"].includes(u!.role))) notFound();
  const items = await getAlbumMedia(a.id);
  return (
    <section className="container-x pt-32">
      <Link href="/gallery" className="inline-flex items-center gap-1 text-sm text-ivory/50 hover:text-gold">
        <Icon name="arrowLeft" size={14} /> All albums
      </Link>
      <div className="mb-10 mt-6">
        <div className="eyebrow">
          {a.matchday ? `Matchday ${a.matchday}` : "Album"}
          {a.takenOn ? ` · ${fmtLong(a.takenOn)}` : ""}
        </div>
        <h1 className="headline mt-3 text-4xl sm:text-6xl">{a.title}</h1>
        {a.description && <p className="mt-4 max-w-2xl text-ivory/60">{a.description}</p>}
      </div>
      {items.length === 0 ? <EmptyState title="No photos yet" body="Photos will appear here soon." /> : <Lightbox items={items} />}
    </section>
  );
}
