import { getCurrentUser, hasMembership } from "@/lib/auth";
import { pickSponsorBanner, type Placement } from "@/lib/sponsors";

/** A sponsor banner for visitors who are not members. Members never see ads. */
export async function SponsorSlot({ placement, className = "" }: { placement: Placement; className?: string }) {
  if (hasMembership(await getCurrentUser())) return null;
  const ad = await pickSponsorBanner(placement);
  if (!ad) return null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/sponsors/${ad.id}/image`} width={ad.width} height={ad.height} alt={`Sponsored by ${ad.sponsor}`} loading="lazy" className="block h-auto w-full rounded-2xl" />
  );
  return (
    <aside className={`container-x ${className}`} aria-label="Sponsor">
      <div className="mx-auto max-w-5xl">
        <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-[0.22em] text-ivory/35">
          <span>Sponsored · {ad.sponsor}</span>
          <a href="/membership" className="hover:text-gold">Members see no ads</a>
        </div>
        {ad.hasLink ? (
          <a href={`/api/sponsors/${ad.id}/click`} target="_blank" rel="sponsored noopener" className="block overflow-hidden rounded-2xl border border-white/[0.06] transition hover:border-gold/40">
            {img}
          </a>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">{img}</div>
        )}
      </div>
    </aside>
  );
}
