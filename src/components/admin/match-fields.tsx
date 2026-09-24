import { Field } from "@/components/form";
import { toLocalInput } from "@/lib/format";

type Opt = { id: string; name: string };
export function MatchFields({
  teams,
  venues,
  referees,
  seasons,
  match,
  mode,
}: {
  teams: Opt[];
  venues: Opt[];
  referees: Opt[];
  seasons?: { id: string; label: string; groups: Opt[] }[];
  match?: { homeTeamId: string | null; awayTeamId: string | null; kickoff: Date; venueId: string | null; refereeId: string | null; round: string; matchday: number | null; statusNote: string | null; publicFrom?: Date | null };
  mode: "create" | "edit";
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {mode === "create" && seasons && (
        <>
          <Field label="Competition season" className="sm:col-span-2">
            <select name="seasonId" className="input" required>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stage">
            <select name="stage" className="input" defaultValue="LEAGUE">
              <option value="LEAGUE">League</option>
              <option value="GROUP">Group stage</option>
              <option value="QUARTER_FINAL">Quarter-final</option>
              <option value="SEMI_FINAL">Semi-final</option>
              <option value="FINAL">Final</option>
            </select>
          </Field>
          <Field label="Group (group stage only)">
            <select name="groupId" className="input" defaultValue="">
              <option value="">None</option>
              {seasons.flatMap((s) => s.groups.map((g) => <option key={g.id} value={g.id}>{`${s.label.split(" · ")[0]}: ${g.name}`}</option>))}
            </select>
          </Field>
          <Field label="Bracket slot (knockouts)">
            <input name="bracketSlot" type="number" min={1} max={4} className="input" />
          </Field>
        </>
      )}
      <Field label="Round label">
        <input name="round" className="input" defaultValue={match?.round ?? ""} placeholder="e.g. Matchday 6" />
      </Field>
      <Field label="Matchday number">
        <input name="matchday" type="number" min={1} className="input" defaultValue={match?.matchday ?? ""} />
      </Field>
      <Field label="Home team">
        <select name="homeTeamId" className="input" defaultValue={match?.homeTeamId ?? ""}>
          <option value="">To be decided</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Away team">
        <select name="awayTeamId" className="input" defaultValue={match?.awayTeamId ?? ""}>
          <option value="">To be decided</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Kick-off (Kampala time)">
        <input name="kickoff" type="datetime-local" className="input" required defaultValue={match ? toLocalInput(match.kickoff) : ""} />
      </Field>
      <Field label="Venue">
        <select name="venueId" className="input" defaultValue={match?.venueId ?? venues[0]?.id ?? ""}>
          <option value="">To be confirmed</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Referee" className="sm:col-span-2">
        <select name="refereeId" className="input" defaultValue={match?.refereeId ?? ""}>
          <option value="">To be appointed</option>
          {referees.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      {mode === "edit" && (
        <>
          <Field label="Members first until (optional)" className="sm:col-span-2">
            <input name="publicFrom" type="datetime-local" className="input" defaultValue={match?.publicFrom ? toLocalInput(match.publicFrom) : ""} />
          </Field>
          <Field label="Public note (e.g. reason for postponement)" className="sm:col-span-2">
            <input name="statusNote" className="input" defaultValue={match?.statusNote ?? ""} />
          </Field>
          <label className="flex items-center gap-3 text-sm text-ivory/70 sm:col-span-2">
            <input type="checkbox" name="postpone" className="accent-[#CC2654]" /> Mark as postponed
          </label>
        </>
      )}
    </div>
  );
}
