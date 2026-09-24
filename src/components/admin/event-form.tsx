"use client";

import { useState } from "react";
import { ActionForm, Field, Submit } from "@/components/form";
import { addEventAction } from "@/app/actions/admin";

type P = { id: string; name: string; number: number; status: string };
type T = { id: string; name: string; players: P[] };

const TYPES = [
  ["GOAL", "Goal"],
  ["PENALTY_GOAL", "Penalty goal"],
  ["OWN_GOAL", "Own goal"],
  ["PENALTY_MISS", "Penalty missed"],
  ["YELLOW", "Yellow card"],
  ["SECOND_YELLOW", "Second yellow (red)"],
  ["RED", "Straight red card"],
  ["SUB", "Substitution"],
] as const;

export function EventForm({ matchId, teams, minute }: { matchId: string; teams: T[]; minute: number | null }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [type, setType] = useState("GOAL");
  const team = teams.find((t) => t.id === teamId);
  const other = teams.find((t) => t.id !== teamId);
  // For an own goal the scorer is from the opposing side, credited to the benefiting team
  const scorerPool = type === "OWN_GOAL" ? other?.players ?? [] : team?.players ?? [];
  const opt = (p: P) => (
    <option key={p.id} value={p.id} disabled={p.status === "SUSPENDED"}>
      {p.number}. {p.name}
      {p.status !== "ACTIVE" ? ` (${p.status.toLowerCase()})` : ""}
    </option>
  );
  return (
    <ActionForm action={addEventAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={matchId} />
      <Field label="Event">
        <select name="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label={type === "OWN_GOAL" ? "Goal credited to" : "Team"}>
        <select name="teamId" className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Minute">
        <input name="minute" type="number" min={0} max={130} className="input" defaultValue={minute ?? ""} required />
      </Field>
      <Field label={type === "SUB" ? "Player on" : type === "OWN_GOAL" ? "Player (own goal by)" : "Player"}>
        <select name="playerId" className="input" key={teamId + type}>
          <option value="">Select player</option>
          {scorerPool.map(opt)}
        </select>
      </Field>
      {(type === "GOAL") && (
        <Field label="Assist (optional)" className="sm:col-span-2">
          <select name="assistId" className="input" key={"a" + teamId}>
            <option value="">No assist</option>
            {team?.players.map(opt)}
          </select>
        </Field>
      )}
      {type === "SUB" && (
        <Field label="Player off" className="sm:col-span-2">
          <select name="playerOffId" className="input" key={"o" + teamId}>
            <option value="">Select player</option>
            {team?.players.map(opt)}
          </select>
        </Field>
      )}
      <div className="sm:col-span-2">
        <Submit className="btn-primary w-full" pendingText="Adding">
          Add event
        </Submit>
        <p className="mt-2 text-xs text-ivory/40">Goals update the score and standings instantly. Red cards and every third yellow apply suspensions automatically.</p>
      </div>
    </ActionForm>
  );
}
