import { ActionForm, Field, Submit } from "@/components/form";
import { savePlayerAction, setPlayerStatusAction } from "@/app/actions/admin";
import type { Player } from "@/db/schema";
import { dayKey } from "@/lib/format";

export function PlayerForm({ player, teams, fixedTeam, admin }: { player?: Player; teams?: { id: string; name: string }[]; fixedTeam?: boolean; admin?: boolean }) {
  return (
    <ActionForm action={savePlayerAction} className="grid gap-5 sm:grid-cols-2" resetOnSuccess={!player}>
      {player && <input type="hidden" name="id" value={player.id} />}
      {!fixedTeam && teams && (
        <Field label="Club" className="sm:col-span-2">
          <select name="teamId" className="input" defaultValue={player?.teamId ?? ""} required>
            <option value="" disabled>
              Select club
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="First name">
        <input name="firstName" className="input" defaultValue={player?.firstName} required />
      </Field>
      <Field label="Last name">
        <input name="lastName" className="input" defaultValue={player?.lastName} required />
      </Field>
      <Field label="Shirt number">
        <input name="number" type="number" min={1} max={99} className="input" defaultValue={player?.number} required />
      </Field>
      <Field label="Position">
        <select name="position" className="input" defaultValue={player?.position ?? "MID"}>
          <option value="GK">Goalkeeper</option>
          <option value="DEF">Defender</option>
          <option value="MID">Midfielder</option>
          <option value="FWD">Forward</option>
        </select>
      </Field>
      <Field label="Student or alumni">
        <select name="affiliation" className="input" defaultValue={player?.affiliation ?? "STUDENT"}>
          <option value="STUDENT">Student</option>
          <option value="ALUMNI">Alumni</option>
        </select>
      </Field>
      <Field label="Year of study / class">
        <input name="yearOfStudy" className="input" defaultValue={player?.yearOfStudy ?? ""} placeholder="Year 2 or Class of 2022" />
      </Field>
      <Field label="Course">
        <input name="course" className="input" defaultValue={player?.course ?? ""} />
      </Field>
      <Field label="Birth year">
        <input name="birthYear" type="number" className="input" defaultValue={player?.birthYear ?? ""} />
      </Field>
      <Field label="Short bio" className="sm:col-span-2">
        <textarea name="bio" rows={3} className="input" defaultValue={player?.bio ?? ""} />
      </Field>
      {!player && admin && (
        <label className="flex items-center gap-3 text-sm text-ivory/70 sm:col-span-2">
          <input type="checkbox" name="approve" defaultChecked className="accent-[#CC2654]" /> Approve immediately
        </label>
      )}
      <div className="sm:col-span-2">
        <Submit>{player ? "Save player" : admin ? "Register player" : "Submit for approval"}</Submit>
      </div>
    </ActionForm>
  );
}

export function PlayerStatusForm({ player, allowSuspend }: { player: Player; allowSuspend: boolean }) {
  return (
    <ActionForm action={setPlayerStatusAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={player.id} />
      <Field label="Availability">
        <select name="status" className="input" defaultValue={["ACTIVE", "INJURED", "SUSPENDED", "INACTIVE"].includes(player.status) ? player.status : "ACTIVE"}>
          <option value="ACTIVE">Available</option>
          <option value="INJURED">Injured</option>
          {allowSuspend && <option value="SUSPENDED">Suspended</option>}
          <option value="INACTIVE">Inactive</option>
        </select>
      </Field>
      <Field label="Expected return / ban ends">
        <input name="until" type="date" className="input" defaultValue={player.statusUntil ? dayKey(player.statusUntil) : ""} />
      </Field>
      <Field label="Note" className="sm:col-span-2">
        <input name="note" className="input" defaultValue={player.statusNote ?? ""} placeholder="e.g. Hamstring strain, or One-match ban" />
      </Field>
      <div className="sm:col-span-2">
        <Submit className="btn-gold">Update availability</Submit>
      </div>
    </ActionForm>
  );
}
