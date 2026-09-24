"use client";

import { useState } from "react";
import { ActionForm, Field, Submit, type FormAction } from "@/components/form";

type P = { id: string; name: string };
type T = { id: string; name: string; players: P[] };

export function VoteForm({ action, teams, hidden, current, label = "Cast your vote" }: { action: FormAction; teams: T[]; hidden?: Record<string, string>; current?: string | null; label?: string }) {
  const initialTeam = teams.find((t) => t.players.some((p) => p.id === current))?.id ?? teams[0]?.id ?? "";
  const [teamId, setTeamId] = useState(initialTeam);
  const team = teams.find((t) => t.id === teamId);
  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end" toast={false} closeOnSuccess={false}>
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Field label="Club">
        <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Player">
        <select name="playerId" className="input" key={teamId} defaultValue={team?.players.some((p) => p.id === current) ? current ?? "" : ""} required>
          <option value="" disabled>
            {team?.players.length ? "Choose a player" : "No registered players yet"}
          </option>
          {team?.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Submit className="btn-gold">{current ? "Change vote" : label}</Submit>
    </ActionForm>
  );
}
