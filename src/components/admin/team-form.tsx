import { Field, Submit, ActionForm } from "@/components/form";
import { saveTeamAction } from "@/app/actions/admin";
import type { Team } from "@/db/schema";

export function TeamForm({ team }: { team?: Team }) {
  return (
    <ActionForm action={saveTeamAction} className="grid gap-5 sm:grid-cols-2" resetOnSuccess={!team}>
      {team && <input type="hidden" name="id" value={team.id} />}
      <Field label="Club name">
        <input name="name" className="input" defaultValue={team?.name} required />
      </Field>
      <Field label="Short name">
        <input name="shortName" className="input" maxLength={4} defaultValue={team?.shortName} />
      </Field>
      <Field label="Intake year (old students who joined Bilal Institute that year)" className="sm:col-span-2">
        <input name="intakeYear" type="number" min={1980} max={2100} className="input" defaultValue={team?.intakeYear ?? ""} placeholder="e.g. 2017" />
      </Field>
      <Field label="Founded">
        <input name="founded" type="number" className="input" defaultValue={team?.founded} />
      </Field>
      <Field label="Crest image path">
        <input name="crest" className="input" defaultValue={team?.crest ?? "/crests/bosa-logo.png"} />
      </Field>
      <Field label="Primary colour">
        <input name="primaryColor" type="color" className="input h-11 p-1" defaultValue={team?.primaryColor ?? "#1B2033"} />
      </Field>
      <Field label="Secondary colour">
        <input name="secondaryColor" type="color" className="input h-11 p-1" defaultValue={team?.secondaryColor ?? "#D6B676"} />
      </Field>
      <Field label="Head coach">
        <input name="coachName" className="input" defaultValue={team?.coachName ?? ""} />
      </Field>
      <Field label="Captain">
        <input name="captainName" className="input" defaultValue={team?.captainName ?? ""} />
      </Field>
      <Field label="Home ground">
        <input name="homeVenue" className="input" defaultValue={team?.homeVenue ?? "Henry's Pitch, Kabalagala"} />
      </Field>
      <Field label="Motto">
        <input name="motto" className="input" defaultValue={team?.motto ?? ""} />
      </Field>
      <Field label="Club biography" className="sm:col-span-2">
        <textarea name="bio" rows={4} className="input" defaultValue={team?.bio ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <Submit>{team ? "Save club" : "Register club"}</Submit>
      </div>
    </ActionForm>
  );
}
