import "server-only";
import { pool } from "@/db";

export type AlbumSummary = { id: string; title: string; description: string | null; matchday: number | null; takenOn: Date | null; coverId: string | null; photos: number; videos: number };

export async function getAlbums(includeUnpublished = false): Promise<AlbumSummary[]> {
  const { rows } = await pool.query(
    `select a.id, a.title, a.description, a.matchday, a.taken_on "takenOn",
       coalesce(a.cover_id, (select m.id from media m where m.album_id = a.id and m.kind = 'PHOTO' order by m."order" limit 1)) "coverId",
       (select count(*) from media m where m.album_id = a.id and m.kind = 'PHOTO')::int photos,
       (select count(*) from media m where m.album_id = a.id and m.kind = 'VIDEO')::int videos
     from albums a where ($1::boolean or a.published) order by coalesce(a.taken_on, a.created_at) desc`,
    [includeUnpublished],
  );
  return rows;
}

export async function getAlbumMedia(albumId: string) {
  const { rows } = await pool.query(
    `select id, kind, caption, video_url "videoUrl", width, height from media where album_id = $1 order by "order", created_at`,
    [albumId],
  );
  return rows as { id: string; kind: string; caption: string | null; videoUrl: string | null; width: number | null; height: number | null }[];
}
