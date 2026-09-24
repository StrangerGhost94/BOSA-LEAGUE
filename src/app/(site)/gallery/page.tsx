import Link from "next/link";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getAlbums } from "@/lib/gallery";
import { MembersNav } from "@/components/members-nav";
import { EmptyState, Icon } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { fmtLong } from "@/lib/format";

export const metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const [u, albums] = await Promise.all([getCurrentUser(), getAlbums()]);
  const member = hasMembership(u);
  return (
    <section className="container-x pt-32">
      <MembersNav active="/gallery" />
      <div className="mt-8">
        <div className="eyebrow">Members&apos; gallery</div>
        <h1 className="headline mt-3 text-5xl sm:text-6xl">
          Photos and <em className="gold-text">highlights</em>
        </h1>
        {!member && (
          <p className="mt-4 max-w-xl text-ivory/60">
            Every matchday&apos;s photos and video highlights, for members.{" "}
            <Link href="/membership" className="text-gold hover:underline">
              Become a member
            </Link>{" "}
            to open the albums.
          </p>
        )}
      </div>
      {albums.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="The first album is on its way" body="Photos and highlights from each matchday will appear here." />
        </div>
      ) : (
        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <StaggerItem key={a.id}>
              <Link href={member ? `/gallery/${a.id}` : "/membership"} className="group block overflow-hidden rounded-2xl border border-white/[0.08] bg-night-800/70 transition hover:-translate-y-1 hover:border-gold/30">
                <div className="relative aspect-[4/3] overflow-hidden bg-night-700">
                  {a.coverId ? (
                    <img
                      src={`/api/media/${a.coverId}?v=${member ? "thumb" : "teaser"}`}
                      alt=""
                      className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${member ? "" : "scale-110 blur-md"}`}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-ivory/30">
                      <Icon name="grid" size={32} />
                    </div>
                  )}
                  {!member && (
                    <div className="absolute inset-0 grid place-items-center bg-night-900/40">
                      <span className="flex items-center gap-2 rounded-full bg-night-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                        <Icon name="lock" size={13} /> Members
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-gold">
                    {a.matchday ? `Matchday ${a.matchday}` : "Album"}
                    {a.takenOn ? ` · ${fmtLong(a.takenOn)}` : ""}
                  </div>
                  <h2 className="mt-2 font-serif text-2xl group-hover:text-gold-300">{a.title}</h2>
                  <div className="mt-2 text-xs text-ivory/45">
                    {a.photos} photo{a.photos === 1 ? "" : "s"}
                    {a.videos ? ` · ${a.videos} highlight${a.videos === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
