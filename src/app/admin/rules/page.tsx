import { PageHeader } from "@/components/panel-shell";
import { Drawer } from "@/components/drawer";
import { ActionForm, Field, Submit } from "@/components/form";
import { getCompetitions, getRules } from "@/lib/data";
import { saveRuleAction, deleteRuleAction } from "@/app/actions/admin";

export const metadata = { title: "Rules" };

function RuleForm({ comps, rule }: { comps: { id: string; name: string }[]; rule?: { id: string; title: string; body: string; competitionId: string | null; order: number } }) {
  return (
    <ActionForm action={saveRuleAction} className="space-y-5" resetOnSuccess={!rule}>
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <Field label="Applies to">
        <select name="competitionId" className="input" defaultValue={rule?.competitionId ?? ""}>
          <option value="">All competitions</option>
          {comps.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title">
        <input name="title" className="input" defaultValue={rule?.title} required />
      </Field>
      <Field label="Rule text">
        <textarea name="body" rows={6} className="input" defaultValue={rule?.body} required />
      </Field>
      <Field label="Display order">
        <input name="order" type="number" className="input" defaultValue={rule?.order ?? 10} />
      </Field>
      <Submit>Save rule</Submit>
    </ActionForm>
  );
}

export default async function AdminRules() {
  const [rules, comps] = await Promise.all([getRules(), getCompetitions()]);
  return (
    <>
      <PageHeader eyebrow="Published on the public Rules page" title="Competition rules">
        <Drawer label="Add rule" title="Add a rule" icon="plus">
          <RuleForm comps={comps} />
        </Drawer>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-2">
        {rules.map((r) => (
          <div key={r.id} className="panel p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold">{r.competition?.name ?? "All competitions"}</div>
            <h3 className="mt-2 font-serif text-xl">{r.title}</h3>
            <p className="mt-2 text-sm text-ivory/60">{r.body}</p>
            <div className="mt-4 flex gap-2">
              <Drawer label="Edit" title="Edit rule" buttonClass="btn-ghost btn-sm">
                <RuleForm comps={comps} rule={r} />
              </Drawer>
              <ActionForm action={deleteRuleAction} confirm="Delete this rule?">
                <input type="hidden" name="id" value={r.id} />
                <Submit className="btn-danger btn-sm">Delete</Submit>
              </ActionForm>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
