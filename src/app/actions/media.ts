"use server";

import sharp from "sharp";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { albums, media } from "@/db/schema";
import { guarded } from "@/lib/guard";
import { fail, ok, str, optStr, num, bool } from "@/lib/result";
import { logActivity } from "@/lib/activity";
import { fromLocalInput } from "@/lib/format";
import type { ActionResult } from "@/components/form";

const MAX_BYTES = 12 * 1024 * 1024;

export async function saveAlbumAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded("news", async (u) => {
    const id = str(fd, "id");
    const title = str(fd, "title");
    if (!title) return fail("Give the album a title.");
    const values = {
      title,
      description: optStr(fd, "description"),
      matchday: num(fd, "matchday"),
      takenOn: str(fd, "takenOn") ? fromLocalInput(`${str(fd, "takenOn")}T12:00`) : null,
      published: bool(fd, "published"),
    };
    if (id) await db.update(albums).set(values).where(eq(albums.id, id));
    else await db.insert(albums).values(values);
    await logActivity(u.id, id ? "Updated album" : "Created album", "Album", title);
    return ok(id ? "Album saved." : "Album created. Open it to add photos.");
  });
}

export async function deleteAlbumAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded("news", async (u) => {
    const [a] = await db.delete(albums).where(eq(albums.id, str(fd, "id"))).returning();
    await logActivity(u.id, "Deleted album", "Album", a?.title);
    return ok("Album deleted.");
  });
}

/** Resizes each photo to a web size, a thumbnail and a blurred teaser, and stores them in the database. */
export async function uploadPhotosAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded("news", async (u) => {
    const albumId = str(fd, "albumId");
    const album = await db.query.albums.findFirst({ where: eq(albums.id, albumId) });
    if (!album) return fail("Album not found.");
    const files = fd.getAll("files").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && (f as File).size > 0);
    if (!files.length) return fail("Choose at least one photo.");
    const { rows } = await db.execute<{ n: number }>(sql`select coalesce(max("order"), 0)::int n from media where album_id = ${albumId}`);
    let order = rows[0]?.n ?? 0;
    let added = 0;
    const skipped: string[] = [];
    let firstId: string | null = null;
    for (const f of files) {
      if (!f.type.startsWith("image/") || f.size > MAX_BYTES) {
        skipped.push(f.name);
        continue;
      }
      try {
        const input = Buffer.from(await f.arrayBuffer());
        const img = sharp(input, { failOn: "none" }).rotate();
        const full = await img.clone().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
        const thumb = await img.clone().resize({ width: 520, height: 520, fit: "cover" }).webp({ quality: 72 }).toBuffer();
        const teaser = await img.clone().resize({ width: 64, height: 64, fit: "cover" }).blur(6).webp({ quality: 50 }).toBuffer();
        const [row] = await db
          .insert(media)
          .values({ albumId, kind: "PHOTO", mime: "image/webp", width: full.info.width, height: full.info.height, full: full.data, thumb, teaser, order: ++order, caption: optStr(fd, "caption") })
          .returning({ id: media.id });
        firstId ??= row.id;
        added++;
      } catch {
        skipped.push(f.name);
      }
    }
    if (!album.coverId && firstId) await db.update(albums).set({ coverId: firstId }).where(eq(albums.id, albumId));
    await logActivity(u.id, "Uploaded photos", "Album", `${added} to ${album.title}`, albumId);
    if (!added) return fail("None of those files could be used. Upload JPG, PNG or WEBP photos under 12 MB.");
    return ok(`${added} photo${added === 1 ? "" : "s"} added.${skipped.length ? ` Skipped: ${skipped.join(", ")}.` : ""}`);
  });
}

function youtubeId(url: string) {
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(url);
  return m?.[1] ?? null;
}

export async function addVideoAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded("news", async (u) => {
    const albumId = str(fd, "albumId");
    const url = str(fd, "videoUrl");
    const idv = youtubeId(url);
    if (!idv) return fail("Paste a YouTube link (youtube.com or youtu.be). Upload the video to YouTube as Unlisted to keep it for members.");
    const { rows } = await db.execute<{ n: number }>(sql`select coalesce(max("order"), 0)::int n from media where album_id = ${albumId}`);
    await db.insert(media).values({ albumId, kind: "VIDEO", videoUrl: `https://www.youtube-nocookie.com/embed/${idv}`, caption: optStr(fd, "caption"), order: (rows[0]?.n ?? 0) + 1 });
    await logActivity(u.id, "Added highlight video", "Album", url, albumId);
    return ok("Highlight added.");
  });
}

export async function deleteMediaAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded("news", async () => {
    const id = str(fd, "id");
    const [m] = await db.delete(media).where(eq(media.id, id)).returning({ albumId: media.albumId });
    if (m) await db.update(albums).set({ coverId: null }).where(and(eq(albums.id, m.albumId), eq(albums.coverId, id)));
    return ok("Removed.");
  });
}

export async function setCoverAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return guarded("news", async () => {
    await db.update(albums).set({ coverId: str(fd, "id") }).where(eq(albums.id, str(fd, "albumId")));
    return ok("Cover updated.");
  });
}
