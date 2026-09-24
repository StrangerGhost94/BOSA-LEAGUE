import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { getMembershipPrice, getVenues } from "@/lib/data";
import { saveSettingsAction, saveVenueAction } from "@/app/actions/admin";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { pesapalConfigured } from "@/lib/pesapal";

export const metadata = { title: "Settings & venues" };

function VenueForm({ v }: { v?: { id: string; name: string; area: string; address: string | null; capacity: number | null } }) {
  return (
    <ActionForm action={saveVenueAction} className="space-y-4" resetOnSuccess={!v}>
      {v && <input type="hidden" name="id" value={v.id} />}
      <Field label="Name">
        <input name="name" className="input" defaultValue={v?.name} required />
      </Field>
      <Field label="Area">
        <input name="area" className="input" defaultValue={v?.area} />
      </Field>
      <Field label="Address / directions">
        <input name="address" className="input" defaultValue={v?.address ?? ""} />
      </Field>
      <Field label="Capacity">
        <input name="capacity" type="number" className="input" defaultValue={v?.capacity ?? ""} />
      </Field>
      <Submit>Save venue</Submit>
    </ActionForm>
  );
}

export default async function Settings() {
  const u = await requirePermission("fixtures");
  const [price, venues] = await Promise.all([getMembershipPrice(), getVenues()]);
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings & venues" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <div className="eyebrow mb-4">Membership</div>
          {can(u.role, "settings") ? (
            <ActionForm action={saveSettingsAction} className="space-y-4">
              <Field label="One-time membership price (UGX)">
                <input name="membership_price" type="number" min={500} step={500} className="input font-display text-2xl" defaultValue={price} />
              </Field>
              <Submit className="btn-gold">Save price</Submit>
            </ActionForm>
          ) : (
            <p className="text-sm text-ivory/55">Only a Super Admin can change the membership price. Current price: UGX {price.toLocaleString()}.</p>
          )}
          <div className="mt-6 rounded-xl border border-white/[0.07] p-4 text-sm text-ivory/60">
            <div className="font-semibold text-ivory">Pesapal: {pesapalConfigured() ? "connected" : "not configured"}</div>
            Set PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET and PESAPAL_ENV=live in your hosting environment variables to accept real payments.
          </div>
        </div>
        <div className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="eyebrow">Venues</div>
            <Drawer label="Add venue" title="Add a venue" buttonClass="btn-ghost btn-sm" icon="plus" side="center">
              <VenueForm />
            </Drawer>
          </div>
          <ul className="space-y-3">
            {venues.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3">
                <div className="flex-1">
                  <div className="font-semibold">{v.name}</div>
                  <div className="text-xs text-ivory/50">
                    {v.area}
                    {v.address ? ` · ${v.address}` : ""}
                    {v.capacity ? ` · capacity ${v.capacity}` : ""}
                  </div>
                </div>
                <Drawer label="Edit" title={`Edit ${v.name}`} buttonClass="btn-quiet btn-sm" side="center">
                  <VenueForm v={v} />
                </Drawer>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
