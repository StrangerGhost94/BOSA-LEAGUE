import Link from "next/link";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { AlbumForm } from "@/components/admin/album-form";
import { EmptyState, Icon, Pill } from "@/components/ui";
import { getAlbums } from "@/lib/gallery";
import { requirePermission } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { db } from "@/db";
import { albums as albumsTable } from "@/db/schema";

export const metadata = { title: "Gallery" };

export default async function AdminGallery() {
  await requirePermission("news");
  const list = await getAlbums(true);
  const published = new Map((await db.select({ id: albumsTable.id, published: albumsTable.published }).from(albumsTable)).map((a) => [a.id, a.published]));
  return (
    <>
      <PageHeader eyebrow="Members-only photos and highlights" title="Gallery">
        <Drawer label="New album" title="Create an album" icon="plus">
          <AlbumForm />
        </Drawer>
      </PageHeader>
      {list.length === 0 && <EmptyState title="No albums yet" body="Create an album for each matchday, then upload photos and add highlight videos." />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <Link key={a.id} href={`/admin/gallery/${a.id}`} className="panel group overflow-hidden transition hover:border-gold/30">
            <div className="aspect-[16/9] bg-night-700">
              {a.coverId ? <img src={`/api/media/${a.coverId}?v=thumb`} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-ivory/30"><Icon name="grid" size={28} /></div>}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg group-hover:text-gold">{a.title}</span>
                {!published.get(a.id) && <Pill tone="crimson">Hidden</Pill>}
              </div>
              <div className="mt-1 text-xs text-ivory/45">
                {a.matchday ? `Matchday ${a.matchday} · ` : ""}
                {a.takenOn ? fmtDate(a.takenOn, { day: "numeric", month: "short", year: "numeric" }) + " · " : ""}
                {a.photos} photos · {a.videos} videos
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
