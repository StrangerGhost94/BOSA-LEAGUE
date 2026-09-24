import Link from "next/link";
import clsx from "clsx";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { getMatch, getTeams, getVenues } from "@/lib/data";
import { getReferees } from "@/lib/admin-data";
import { ActionForm, Field, Submit } from "@/components/form";
import { Crest, Icon, StatusBadge } from "@/components/ui";
import { AnimatedScore } from "@/components/motion";
import { EventForm } from "./event-form";
import { MatchFields } from "./match-fields";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  setMatchStatusAction,
  setMinuteAction,
  setScoreAction,
  deleteEventAction,
  saveLineupAction,
  saveMatchReportAction,
  updateScheduleAction,
  deleteMatchAction,
} from "@/app/actions/admin";
import { fmtLong, fmtTime, liveMinute } from "@/lib/format";

const EV: Record<string, string> = { GOAL: "Goal", PENALTY_GOAL: "Penalty", OWN_GOAL: "Own goal", PENALTY_MISS: "Pen. missed", YELLOW: "Yellow", SECOND_YELLOW: "2nd yellow", RED: "Red", SUB: "Sub" };

export async function MatchConsole({ id, mode }: { id: string; mode: "admin" | "referee" }) {
  const m = await getMatch(id);
  if (!m) return <p>Match not found.</p>;
  const squads = await Promise.all(
    [m.homeTeam, m.awayTeam].map(async (t) =>
      t
        ? {
            id: t.id,
            name: t.name,
            crest: t.crest,
            primaryColor: t.primaryColor,
            players: await db.query.players.findMany({
              where: and(eq(s.players.teamId, t.id), notInArray(s.players.status, ["PENDING", "REJECTED"])),
              orderBy: asc(s.players.number),
            }),
          }
        : null,
    ),
  );
  const teams = squads.filter(Boolean) as NonNullable<(typeof squads)[number]>[];
  const knockout = ["QUARTER_FINAL", "SEMI_FINAL", "FINAL"].includes(m.stage);
  const live = m.status === "LIVE" || m.status === "HALF_TIME";
  const [allTeams, venues, referees] = mode === "admin" ? await Promise.all([getTeams(), getVenues(), getReferees()]) : [[], [], []];
  const statusBtn = (status: string, label: string, cls: string, minute?: number) => (
    <ActionForm action={setMatchStatusAction} key={status + label}>
      <input type="hidden" name="id" value={m.id} />
      <input type="hidden" name="status" value={status} />
      {minute != null && <input type="hidden" name="minute" value={minute} />}
      <Submit className={cls}>{label}</Submit>
    </ActionForm>
  );

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={live} seconds={30} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={mode === "admin" ? "/admin/fixtures" : "/referee"} className="inline-flex items-center gap-1 text-ivory/50 hover:text-gold">
          <Icon name="arrowLeft" size={14} /> Back
        </Link>
        <span className="text-ivory/30">/</span>
        <span className="text-ivory/60">
          {m.season.competition.name} · {m.round}
        </span>
        <Link href={`/matches/${m.id}`} className="ml-auto text-xs text-gold hover:underline">
          Public match page
        </Link>
      </div>

      {/* Scoreboard */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8" style={{ background: `linear-gradient(110deg, ${m.homeTeam?.primaryColor ?? "#1B2033"}55, #0A0F1E 40%, #0A0F1E 60%, ${m.awayTeam?.primaryColor ?? "#1B2033"}55)` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={m.status} minute={liveMinute(m)} />
          <span className="text-xs text-ivory/55">
            {fmtLong(m.kickoff)} · {fmtTime(m.kickoff)} · {m.venue?.name ?? "Venue TBC"} · {m.referee?.name ?? "No referee"}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <Crest team={m.homeTeam} size={72} />
            <span className="font-serif text-xl sm:text-2xl">{m.homeTeam?.name ?? "TBD"}</span>
          </div>
          <div className="text-center font-display text-6xl tabular-nums sm:text-7xl">
            <AnimatedScore value={m.homeScore} /> <span className="text-ivory/25">:</span> <AnimatedScore value={m.awayScore} />
            {m.homePens != null && <div className="text-sm text-gold">Pens {m.homePens}-{m.awayPens}</div>}
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <Crest team={m.awayTeam} size={72} />
            <span className="font-serif text-xl sm:text-2xl">{m.awayTeam?.name ?? "TBD"}</span>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {m.status === "SCHEDULED" || m.status === "POSTPONED" ? statusBtn("LIVE", "Kick off", "btn-primary btn-sm", 1) : null}
          {m.status === "LIVE" && statusBtn("HALF_TIME", "Half-time", "btn-ghost btn-sm")}
          {m.status === "HALF_TIME" && statusBtn("LIVE", "Start second half", "btn-primary btn-sm", 46)}
          {live && statusBtn("FULL_TIME", "Full-time", "btn-gold btn-sm")}
          {m.status === "FULL_TIME" && statusBtn("LIVE", "Reopen match", "btn-ghost btn-sm")}
          {mode === "admin" && m.status !== "FULL_TIME" && statusBtn("POSTPONED", "Postpone", "btn-quiet btn-sm")}
          {mode === "admin" && m.status !== "FULL_TIME" && statusBtn("CANCELLED", "Cancel", "btn-danger btn-sm")}
          {live && (
            <ActionForm action={setMinuteAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={m.id} />
              <input name="minute" type="number" min={0} max={130} defaultValue={liveMinute(m) ?? 0} className="input w-20 py-1.5 text-center" aria-label="Minute" />
              <Submit className="btn-quiet btn-sm">Set minute</Submit>
            </ActionForm>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <div className="eyebrow mb-1">Record result</div>
          <p className="mb-5 text-xs text-ivory/45">Enter the score directly, or build it from goal events below. Ticking full-time locks the result into the standings.</p>
          <ActionForm action={setScoreAction} className="space-y-5">
            <input type="hidden" name="id" value={m.id} />
            <div className="grid grid-cols-2 gap-4">
              <Field label={`${m.homeTeam?.shortName ?? "Home"} goals`}>
                <input name="homeScore" type="number" min={0} className="input text-center font-display text-2xl" defaultValue={m.homeScore ?? 0} />
              </Field>
              <Field label={`${m.awayTeam?.shortName ?? "Away"} goals`}>
                <input name="awayScore" type="number" min={0} className="input text-center font-display text-2xl" defaultValue={m.awayScore ?? 0} />
              </Field>
              {knockout && (
                <>
                  <Field label="Home penalties">
                    <input name="homePens" type="number" min={0} className="input" defaultValue={m.homePens ?? ""} />
                  </Field>
                  <Field label="Away penalties">
                    <input name="awayPens" type="number" min={0} className="input" defaultValue={m.awayPens ?? ""} />
                  </Field>
                </>
              )}
            </div>
            <label className="flex items-center gap-3 text-sm text-ivory/70">
              <input type="checkbox" name="finalise" defaultChecked={m.status !== "LIVE" && m.status !== "HALF_TIME"} className="accent-[#CC2654]" /> Confirm as full-time result
            </label>
            <Submit className="btn-gold w-full" pendingText="Saving">
              Save result
            </Submit>
          </ActionForm>
        </div>

        <div className="panel p-6">
          <div className="eyebrow mb-5">Add match event</div>
          {teams.length === 2 ? (
            <EventForm
              matchId={m.id}
              minute={liveMinute(m)}
              teams={teams.map((t) => ({ id: t.id, name: t.name, players: t.players.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, number: p.number, status: p.status })) }))}
            />
          ) : (
            <p className="text-sm text-ivory/45">Both teams must be set before events can be recorded.</p>
          )}
        </div>
      </div>

      <div className="panel p-6">
        <div className="eyebrow mb-4">Event timeline</div>
        {m.events.length === 0 && <p className="text-sm text-ivory/45">No events recorded.</p>}
        <ul className="divide-y divide-white/[0.05]">
          {m.events.map((e) => {
            const home = e.teamId === m.homeTeamId;
            return (
              <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-10 font-display text-gold">{e.minute}&apos;</span>
                <span className={clsx("w-24 text-[11px] font-semibold uppercase tracking-[0.12em]", e.type.includes("RED") || e.type === "SECOND_YELLOW" ? "text-crimson-400" : e.type === "YELLOW" ? "text-yellow-400" : e.type === "SUB" ? "text-emerald-400" : "text-ivory")}>
                  {EV[e.type]}
                </span>
                <Crest team={home ? m.homeTeam : m.awayTeam} size={20} />
                <span className="flex-1">
                  {e.player ? `${e.player.firstName} ${e.player.lastName}` : "Unknown"}
                  {e.assist && <span className="text-ivory/45"> · assist {e.assist.firstName} {e.assist.lastName}</span>}
                  {e.playerOff && <span className="text-ivory/45"> · for {e.playerOff.firstName} {e.playerOff.lastName}</span>}
                </span>
                <ActionForm action={deleteEventAction} confirm="Remove this event?">
                  <input type="hidden" name="eventId" value={e.id} />
                  <Submit className="grid h-8 w-8 place-items-center rounded-lg text-ivory/40 hover:bg-crimson/10 hover:text-crimson-400">
                    <Icon name="close" size={14} />
                  </Submit>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {teams.map((t) => {
          const lu = new Map(m.lineups.filter((l) => l.teamId === t.id).map((l) => [l.playerId, l.starter]));
          return (
            <div key={t.id} className="panel p-6">
              <div className="mb-4 flex items-center gap-3">
                <Crest team={t} size={28} />
                <div className="eyebrow">{t.name} team sheet</div>
                <span className="ml-auto text-xs text-ivory/40">{Array.from(lu.values()).filter(Boolean).length} starters</span>
              </div>
              <ActionForm action={saveLineupAction}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="teamId" value={t.id} />
                <div className="mb-2 grid grid-cols-[1fr_64px_64px] px-2 text-[10px] uppercase tracking-[0.16em] text-ivory/40">
                  <span>Player</span>
                  <span className="text-center">Start</span>
                  <span className="text-center">Bench</span>
                </div>
                <div className="max-h-80 overflow-y-auto pr-1" data-lenis-prevent>
                  {t.players.map((p) => (
                    <div key={p.id} className="grid grid-cols-[1fr_64px_64px] items-center rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
                      <span className={clsx(p.status === "SUSPENDED" && "text-crimson-400 line-through", p.status === "INJURED" && "text-gold")}>
                        <span className="mr-2 inline-block w-6 font-display text-ivory/50">{p.number || "–"}</span>
                        {p.firstName} {p.lastName} <span className="text-[10px] text-ivory/35">{p.position}</span>
                      </span>
                      <input type="checkbox" name="starter" value={p.id} defaultChecked={lu.get(p.id) === true} disabled={p.status === "SUSPENDED"} className="mx-auto accent-[#D6B676]" aria-label={`Start ${p.firstName}`} />
                      <input type="checkbox" name="sub" value={p.id} defaultChecked={lu.get(p.id) === false} disabled={p.status === "SUSPENDED"} className="mx-auto accent-[#1E8C6B]" aria-label={`Bench ${p.firstName}`} />
                    </div>
                  ))}
                </div>
                <Submit className="btn-ghost btn-sm mt-4">Save team sheet</Submit>
              </ActionForm>
            </div>
          );
        })}
      </div>

      <div className="panel p-6">
        <div className="eyebrow mb-5">Match report and awards</div>
        <ActionForm action={saveMatchReportAction} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={m.id} />
          <Field label="Player of the match">
            <select name="potmId" className="input" defaultValue={m.potmId ?? ""}>
              <option value="">Not awarded</option>
              {teams.map((t) => (
                <optgroup key={t.id} label={t.name}>
                  {t.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `${p.number}. ` : ""}{p.firstName} {p.lastName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Attendance">
            <input name="attendance" type="number" min={0} className="input" defaultValue={m.attendance ?? ""} />
          </Field>
          <Field label="Match report" className="sm:col-span-2">
            <textarea name="report" rows={6} className="input" defaultValue={m.report ?? ""} placeholder="Write the story of the match. Separate paragraphs with a blank line." />
          </Field>
          <div>
            <Submit className="btn-gold">Save report</Submit>
          </div>
        </ActionForm>
      </div>

      {mode === "admin" && (
        <div className="panel p-6">
          <div className="eyebrow mb-5">Schedule, venue and referee</div>
          <ActionForm action={updateScheduleAction} className="space-y-5">
            <input type="hidden" name="id" value={m.id} />
            <MatchFields mode="edit" teams={allTeams} venues={venues} referees={referees} match={m} />
            <Submit className="btn-primary">Save changes</Submit>
          </ActionForm>
          <div className="mt-8 border-t border-white/[0.06] pt-6">
            <ActionForm action={deleteMatchAction} confirm="Delete this fixture permanently? Events and line-ups will be removed.">
              <input type="hidden" name="id" value={m.id} />
              <Submit className="btn-danger btn-sm">Delete fixture</Submit>
            </ActionForm>
          </div>
        </div>
      )}
    </div>
  );
}
