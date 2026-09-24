import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Field, Submit } from "@/components/form";
import { updateOwnTeamAction } from "@/app/actions/admin";
import { Crest } from "@/components/ui";

export const metadata = { title: "Club profile" };

export default async function ClubProfile() {
  const u = await requireRole(["TEAM_MANAGER"]);
  const t = u.team;
  if (!t) return null;
  return (
    <>
      <PageHeader eyebrow="Shown on your public club page" title="Club profile" />
      <div className="panel p-6">
        <div className="mb-6 flex items-center gap-4">
          <Crest team={t} size={64} />
          <div>
            <div className="font-serif text-2xl">{t.name}</div>
            <div className="text-sm text-ivory/50">To change the club name or crest, contact the League office.</div>
          </div>
        </div>
        <ActionForm action={updateOwnTeamAction} className="grid gap-5 sm:grid-cols-2">
          <Field label="Head coach">
            <input name="coachName" className="input" defaultValue={t.coachName ?? ""} />
          </Field>
          <Field label="Captain">
            <input name="captainName" className="input" defaultValue={t.captainName ?? ""} />
          </Field>
          <Field label="Primary colour">
            <input name="primaryColor" type="color" className="input h-11 p-1" defaultValue={t.primaryColor} />
          </Field>
          <Field label="Secondary colour">
            <input name="secondaryColor" type="color" className="input h-11 p-1" defaultValue={t.secondaryColor} />
          </Field>
          <Field label="Motto" className="sm:col-span-2">
            <input name="motto" className="input" defaultValue={t.motto ?? ""} />
          </Field>
          <Field label="Club biography" className="sm:col-span-2">
            <textarea name="bio" rows={5} className="input" defaultValue={t.bio ?? ""} />
          </Field>
          <div>
            <Submit>Save club profile</Submit>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
