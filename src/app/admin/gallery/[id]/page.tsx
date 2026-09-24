import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getAlbumMedia } from "@/lib/gallery";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { AlbumForm } from "@/components/admin/album-form";
import { Icon, Pill } from "@/components/ui";
import { addVideoAction, deleteAlbumAction, deleteMediaAction, setCoverAction, uploadPhotosAction } from "@/app/actions/media";

export default async function AdminAlbum({ params }: { params: { id: string } }) {
  await requirePermission("news");
  const a = await db.query.albums.findFirst({ where: eq(albums.id, params.id) });
  if (!a) notFound();
  const items = await getAlbumMedia(a.id);
  return (
    <>
      <Link href="/admin/gallery" className="mb-4 inline-flex items-center gap-1 text-sm text-ivory/50 hover:text-gold">
        <Icon name="arrowLeft" size={14} /> All albums
      </Link>
      <PageHeader eyebrow={a.published ? "Visible to members" : "Hidden"} title={a.title}>
        <Link href={`/gallery/${a.id}`} className="btn-quiet btn-sm">
          View as member
        </Link>
        <Drawer label="Album settings" title="Album settings" buttonClass="btn-ghost btn-sm" icon="settings">
          <AlbumForm album={a} />
          <div className="mt-8 border-t border-white/[0.06] pt-6">
            <ActionForm action={deleteAlbumAction} confirm="Delete this album and all of its photos?">
              <input type="hidden" name="id" value={a.id} />
              <Submit className="btn-danger btn-sm">Delete album</Submit>
            </ActionForm>
          </div>
        </Drawer>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <div className="eyebrow mb-4">Upload photos</div>
          <ActionForm action={uploadPhotosAction} className="space-y-4" resetOnSuccess>
            <input type="hidden" name="albumId" value={a.id} />
            <Field label="Photos (you can choose many at once)">
              <input name="files" type="file" accept="image/*" multiple required className="input file:mr-3 file:rounded-full file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-gold" />
            </Field>
            <Field label="Caption for these photos (optional)">
              <input name="caption" className="input" />
            </Field>
            <Submit pendingText="Uploading and resizing">Upload</Submit>
            <p className="text-xs text-ivory/40">Photos are resized automatically for phones. Upload up to about 20 at a time on mobile data.</p>
          </ActionForm>
        </div>
        <div className="panel p-6">
          <div className="eyebrow mb-4">Add a highlight video</div>
          <ActionForm action={addVideoAction} className="space-y-4" resetOnSuccess>
            <input type="hidden" name="albumId" value={a.id} />
            <Field label="YouTube link">
              <input name="videoUrl" className="input" placeholder="https://youtu.be/..." required />
            </Field>
            <Field label="Caption (optional)">
              <input name="caption" className="input" placeholder="e.g. All the goals from Matchday 5" />
            </Field>
            <Submit>Add highlight</Submit>
            <p className="text-xs text-ivory/40">Upload the video to YouTube as &ldquo;Unlisted&rdquo; so only people with the link (your members) can find it.</p>
          </ActionForm>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((m) => (
          <div key={m.id} className="panel overflow-hidden">
            <div className="relative aspect-square bg-night-700">
              {m.kind === "PHOTO" ? (
                <img src={`/api/media/${m.id}?v=thumb`} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center p-3 text-center text-xs text-ivory/60">
                  <Icon name="ball" size={24} className="mb-2 text-gold" />
                  Video: {m.caption ?? "highlight"}
                </div>
              )}
              {a.coverId === m.id && <span className="absolute left-2 top-2"><Pill tone="gold">Cover</Pill></span>}
            </div>
            <div className="flex gap-1 p-2">
              {m.kind === "PHOTO" && a.coverId !== m.id && (
                <ActionForm action={setCoverAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="albumId" value={a.id} />
                  <Submit className="btn-quiet btn-sm">Cover</Submit>
                </ActionForm>
              )}
              <ActionForm action={deleteMediaAction} confirm="Remove this item?">
                <input type="hidden" name="id" value={m.id} />
                <Submit className="btn-danger btn-sm">Remove</Submit>
              </ActionForm>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
