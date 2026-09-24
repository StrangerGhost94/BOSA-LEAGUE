import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Field, Submit } from "@/components/form";
import { Crest, Pill, StatTile } from "@/components/ui";
import { announceSeasonAction, reinstateTeamAction, runEngineAction, withdrawTeamAction } from "@/app/actions/season";
import { getSeasonState, CL_PLACES, type Phase } from "@/lib/season-engine";
import { getTeams } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { addDays, eatDay, nextSunday } from "@/lib/scheduler";

export const metadata = { title: "Season control" };

const PHASES: { key: Phase; title: string; body: string }[] = [
  { key: "PRESEASON", title: "Announced", body: "Opening day is set. The Super Cup opens the season; league Matchday 1 is the following Sunday." },
  { key: "LEAGUE", title: "League", body: "Every club plays every other club once, one matchday each Sunday. Fixtures are scheduled automatically." },
  { key: "CHAMPIONS", title: "Champions League", body: `When the last league match is played, the champion is crowned and the top ${CL_PLACES} are drawn into a knock-out: 1 v 8, 4 v 5, 2 v 7, 3 v 6.` },
  { key: "OFF_SEASON", title: "Off season", body: "After the Champions League final. Set the opening day of the next season below and everything else is scheduled for you." },
];

export default async function SeasonControl() {
  const u = await requireUser("/admin/season");
  const [state, teams] = await Promise.all([getSeasonState(), getTeams()]);
  const inLeague = state.league ? (await db.select({ id: s.seasonTeams.teamId }).from(s.seasonTeams).where(eq(s.seasonTeams.seasonId, state.league.id))).map((r) => r.id) : [];
  const superMatch = state.superMatch
    ? await db.query.matches.findFirst({ where: eq(s.matches.id, state.superMatch.id), with: { homeTeam: true, awayTeam: true } })
    : null;
  const name = (id?: string | null) => teams.find((t) => t.id === id)?.name ?? "Not decided yet";
  const canAnnounce = state.phase === "OFF_SEASON" || state.phase === "NONE";
  const suggested = nextSunday(addDays(eatDay(new Date()), 7));
  const active = teams.filter((t) => t.active);
  const withdrawn = teams.filter((t) => !t.active);
  const phaseIdx = PHASES.findIndex((p) => p.key === state.phase);

  return (
    <>
      <PageHeader eyebrow={state.league ? `${state.league.name} · ${state.league.year}` : "No season yet"} title="Season control">
        <ActionForm action={runEngineAction}>
          <Submit className="btn-ghost btn-sm" pendingText="Checking...">
            Check the schedule now
          </Submit>
        </ActionForm>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Stage now" hint={state.league ? `${state.league.name} · ${state.league.year}` : undefined}>{PHASES[phaseIdx]?.title ?? "No season"}</StatTile>
        <StatTile label="League matches played" hint={`${Math.max(0, state.total - state.played)} still to play`}>
          {state.played}/{state.total}
        </StatTile>
        <StatTile label="Champions League" accent="emerald" hint={state.champions?.name}>{state.clStage ?? "Not started"}</StatTile>
        <StatTile label="League champion" accent="crimson" hint={state.league?.name}>{state.league?.championId ? name(state.league.championId) : "TBC"}</StatTile>
      </div>

      {/* How the season runs */}
      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {PHASES.map((p, i) => (
          <div key={p.key} className={`panel p-5 ${i === phaseIdx ? "border-gold/40 bg-gold/[0.05]" : "opacity-70"}`}>
            <div className="flex items-center justify-between">
              <span className="font-display text-3xl text-ivory/25">0{i + 1}</span>
              {i === phaseIdx && <Pill tone="gold">Now</Pill>}
            </div>
            <h3 className="mt-3 font-serif text-xl">{p.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-ivory/55">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="panel p-6">
          <div className="eyebrow mb-2">Start the next season</div>
          {canAnnounce ? (
            <>
              <p className="mb-5 text-sm leading-relaxed text-ivory/60">
                Choose the opening day. The system creates the new season, schedules the Super Cup ({name(state.league?.championId)} v {name(state.champions?.championId)}) on that day, draws every league fixture from the
                following Sunday for the {active.length} active clubs, and publishes an announcement in the Newsroom.
              </p>
              <ActionForm action={announceSeasonAction} className="grid gap-5 sm:grid-cols-2" confirm="Announce the new season? This creates all fixtures and publishes the announcement.">
                <Field label="Opening day (Super Cup)">
                  <input type="date" name="openingDay" className="input" defaultValue={suggested} required />
                </Field>
                <Field label="Super Cup kick-off">
                  <input type="time" name="superCupTime" className="input" defaultValue="15:00" required />
                </Field>
                <div className="sm:col-span-2">
                  <Submit pendingText="Scheduling the season...">Announce the season</Submit>
                </div>
              </ActionForm>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ivory/60">
              {state.phase === "PRESEASON"
                ? `${state.league?.name} has been announced and opens on ${state.league?.startsAt ? fmtDate(state.league.startsAt, { weekday: "long", day: "numeric", month: "long" }) : "the set day"}. Fixtures are on the Fixtures page. If a club joins or withdraws before the first league match, the fixtures are redrawn automatically.`
                : "The current season is still running. Once the Champions League final has been played, the off season begins and you can set the opening day of the next season here."}
            </p>
          )}
        </div>

        <div className="panel p-6">
          <div className="eyebrow mb-4">Super Cup</div>
          {superMatch ? (
            <div className="flex items-center gap-4">
              {superMatch.homeTeam && <Crest team={superMatch.homeTeam} size={40} />}
              <div className="flex-1 text-sm">
                <div className="font-semibold">
                  {superMatch.homeTeam?.name ?? "TBC"} {superMatch.status === "FULL_TIME" ? `${superMatch.homeScore}-${superMatch.awayScore}` : "v"} {superMatch.awayTeam?.name ?? "TBC"}
                </div>
                <div className="text-xs text-ivory/50">{fmtDateTime(superMatch.kickoff)}</div>
              </div>
              {superMatch.awayTeam && <Crest team={superMatch.awayTeam} size={40} />}
            </div>
          ) : (
            <p className="text-sm text-ivory/55">
              {state.superCup?.championId ? `${name(state.superCup.championId)} hold the Super Cup (${state.superCup.name}).` : "Scheduled automatically when the next season is announced."}
            </p>
          )}
          <p className="mt-4 text-xs text-ivory/40">If the same club wins the league and the Champions League, the league runner-up takes the second place.</p>
        </div>
      </div>

      {/* Clubs */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">Clubs</div>
            <p className="mt-1 max-w-2xl text-xs text-ivory/50">
              A new club (register it on the Teams page) plays from the next season. A club that withdraws during the league has all its results removed and its remaining fixtures cancelled; a knock-out tie it still had to play goes 3-0 to the opponent.
            </p>
          </div>
          <Link href="/admin/teams" className="btn-ghost btn-sm">
            Register a club
          </Link>
        </div>
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07]">
          {[...active, ...withdrawn].map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 bg-night-800/50 px-5 py-3">
              <Crest team={t} size={34} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-ivory/45">
                  {!t.active
                    ? `Withdrew ${t.withdrawnAt ? fmtDate(t.withdrawnAt, { day: "numeric", month: "short", year: "numeric" }) : ""}`
                    : inLeague.includes(t.id)
                      ? `Playing in ${state.league?.name}`
                      : "Joins from the next season"}
                </div>
              </div>
              {can(u.role, "teams") &&
                (t.active ? (
                  <ActionForm action={withdrawTeamAction} confirm={`Withdraw ${t.name}? During the league this removes all their results and cancels their remaining fixtures. This cannot be undone for the current season.`}>
                    <input type="hidden" name="teamId" value={t.id} />
                    <Submit className="btn-quiet btn-sm text-crimson-400" pendingText="Withdrawing...">
                      Withdraw
                    </Submit>
                  </ActionForm>
                ) : (
                  <ActionForm action={reinstateTeamAction}>
                    <input type="hidden" name="teamId" value={t.id} />
                    <Submit className="btn-ghost btn-sm" pendingText="Reinstating...">
                      Reinstate
                    </Submit>
                  </ActionForm>
                ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
