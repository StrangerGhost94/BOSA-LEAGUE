import { desc } from "drizzle-orm";
import { db } from "@/db";
import { sponsorAds } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PLACEMENTS } from "@/lib/sponsors";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { EmptyState, Pill } from "@/components/ui";
import { deleteSponsorAdAction, saveSponsorAdAction } from "@/app/actions/admin";

export const metadata = { title: "Sponsors" };

type Ad = Omit<typeof sponsorAds.$inferSelect, "image">;
const kampalaDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kampala" }).format(d);
const placeLabel = (v: string) => PLACEMENTS.find((p) => p.value === v)?.label ?? v;

function SponsorForm({ ad }: { ad?: Ad }) {
  return (
    <ActionForm action={saveSponsorAdAction} className="space-y-5" resetOnSuccess={!ad}>
      {ad && <input type="hidden" name="id" value={ad.id} />}
      <Field label="Sponsor">
        <input name="sponsor" className="input" defaultValue={ad?.sponsor} placeholder="e.g. Weli Travel" required />
      </Field>
      <Field label={ad ? "New banner image (leave empty to keep the current one)" : "Banner image"}>
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input" required={!ad} />
      </Field>
      <p className="-mt-3 text-xs text-ivory/45">Best size: 1200 × 300 pixels (a wide strip). JPG, PNG or WEBP under 8 MB.</p>
      <Field label="Sponsor's website (optional)">
        <input name="url" className="input" defaultValue={ad?.url ?? ""} placeholder="https://www.example.com" />
      </Field>
      <Field label="Where it shows">
        <select name="placement" className="input" defaultValue={ad?.placement ?? "ALL"}>
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First day (optional)">
          <input name="startsOn" type="date" className="input" defaultValue={ad?.startsOn ? kampalaDate(ad.startsOn) : ""} />
        </Field>
        <Field label="Last day (optional)">
          <input name="endsOn" type="date" className="input" defaultValue={ad?.endsOn ? kampalaDate(new Date(ad.endsOn.getTime() - 86_400_000)) : ""} />
        </Field>
      </div>
      <label className="flex items-center gap-3 text-sm text-ivory/70">
        <input type="checkbox" name="active" defaultChecked={ad?.active ?? true} className="accent-[#CC2654]" /> Show this banner
      </label>
      <Submit>Save banner</Submit>
    </ActionForm>
  );
}

function status(ad: Ad) {
  const now = Date.now();
  if (!ad.active) return <Pill tone="crimson">Paused</Pill>;
  if (ad.startsOn && ad.startsOn.getTime() > now) return <Pill tone="gold">Starts {kampalaDate(ad.startsOn)}</Pill>;
  if (ad.endsOn && ad.endsOn.getTime() <= now) return <Pill tone="crimson">Ended</Pill>;
  return <Pill tone="emerald">Showing</Pill>;
}

export default async function AdminSponsors() {
  await requirePermission("perks");
  const list: Ad[] = await db
    .select({
      id: sponsorAds.id,
      sponsor: sponsorAds.sponsor,
      url: sponsorAds.url,
      width: sponsorAds.width,
      height: sponsorAds.height,
      placement: sponsorAds.placement,
      active: sponsorAds.active,
      startsOn: sponsorAds.startsOn,
      endsOn: sponsorAds.endsOn,
      impressions: sponsorAds.impressions,
      clicks: sponsorAds.clicks,
      createdAt: sponsorAds.createdAt,
    })
    .from(sponsorAds)
    .orderBy(desc(sponsorAds.createdAt));
  return (
    <>
      <PageHeader eyebrow="Banners for visitors who are not members (members see no ads)" title="Sponsors">
        <Drawer label="Add banner" title="Add a sponsor banner" icon="plus">
          <SponsorForm />
        </Drawer>
      </PageHeader>
      {list.length === 0 && (
        <EmptyState
          title="No sponsor banners yet"
          body="Sell banner spots to local businesses. Banners show on the home, league table and fixtures pages to everyone who is not a member, and you can see how many people saw and clicked each one."
        />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((ad) => (
          <div key={ad.id} className="panel overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/sponsors/${ad.id}/image`} width={ad.width} height={ad.height} alt={ad.sponsor} className="block h-auto w-full" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-serif text-xl">{ad.sponsor}</span>
                {status(ad)}
              </div>
              <div className="mt-1 text-xs text-ivory/50">
                {placeLabel(ad.placement)}
                {ad.url ? ` · ${ad.url.replace(/^https?:\/\//, "")}` : " · no link"}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <div className="font-display text-2xl">{ad.impressions.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ivory/45">Views</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <div className="font-display text-2xl">{ad.clicks.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ivory/45">Clicks</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] p-3">
                  <div className="font-display text-2xl">{ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0"}%</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ivory/45">Click rate</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Drawer label="Edit" title={`Edit ${ad.sponsor}`} buttonClass="btn-ghost btn-sm">
                  <SponsorForm ad={ad} />
                </Drawer>
                <ActionForm action={deleteSponsorAdAction} confirm="Delete this banner? Its view and click counts go too.">
                  <input type="hidden" name="id" value={ad.id} />
                  <Submit className="btn-danger btn-sm">Delete</Submit>
                </ActionForm>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
