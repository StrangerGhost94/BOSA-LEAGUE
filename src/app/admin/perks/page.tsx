import { asc } from "drizzle-orm";
import { db } from "@/db";
import { perks } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { EmptyState, Pill } from "@/components/ui";
import { deletePerkAction, savePerkAction } from "@/app/actions/admin";

export const metadata = { title: "Member perks" };

function PerkForm({ perk }: { perk?: typeof perks.$inferSelect }) {
  return (
    <ActionForm action={savePerkAction} className="space-y-5" resetOnSuccess={!perk}>
      {perk && <input type="hidden" name="id" value={perk.id} />}
      <Field label="Partner or sponsor">
        <input name="sponsor" className="input" defaultValue={perk?.sponsor} placeholder="e.g. Weli Travel" required />
      </Field>
      <Field label="Offer">
        <input name="offer" className="input" defaultValue={perk?.offer} placeholder="e.g. 10% off airport transfers" required />
      </Field>
      <Field label="Details (optional)">
        <textarea name="details" rows={3} className="input" defaultValue={perk?.details ?? ""} placeholder="How to claim, where, and until when" />
      </Field>
      <Field label="Display order">
        <input name="order" type="number" className="input" defaultValue={perk?.order ?? 0} />
      </Field>
      <label className="flex items-center gap-3 text-sm text-ivory/70">
        <input type="checkbox" name="active" defaultChecked={perk?.active ?? true} className="accent-[#CC2654]" /> Show to members
      </label>
      <Submit>Save offer</Submit>
    </ActionForm>
  );
}

export default async function AdminPerks() {
  await requirePermission("perks");
  const list = await db.query.perks.findMany({ orderBy: asc(perks.order) });
  return (
    <>
      <PageHeader eyebrow="Shown on the member card and members' page" title="Member perks">
        <Drawer label="Add offer" title="Add a partner offer" icon="plus">
          <PerkForm />
        </Drawer>
      </PageHeader>
      {list.length === 0 && <EmptyState title="No partner offers yet" body="Add offers from your sponsors. Members show their digital card to claim them, and partners scan its QR code to check it is valid." />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <div key={p.id} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-gold">{p.sponsor}</span>
              {!p.active && <Pill tone="crimson">Hidden</Pill>}
            </div>
            <div className="mt-2 font-serif text-xl">{p.offer}</div>
            {p.details && <p className="mt-2 text-sm text-ivory/55">{p.details}</p>}
            <div className="mt-4 flex gap-2">
              <Drawer label="Edit" title="Edit offer" buttonClass="btn-ghost btn-sm">
                <PerkForm perk={p} />
              </Drawer>
              <ActionForm action={deletePerkAction} confirm="Delete this offer?">
                <input type="hidden" name="id" value={p.id} />
                <Submit className="btn-danger btn-sm">Delete</Submit>
              </ActionForm>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
