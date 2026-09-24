import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ActionForm, Field, Submit } from "@/components/form";
import { Crest, StatusBadge } from "@/components/ui";
import { scheduleSuperMatchAction } from "@/app/actions/admin";
import { getReferees } from "@/lib/admin-data";
import { getTeams, getVenues } from "@/lib/data";
import { fmtDateTime, toLocalInput } from "@/lib/format";

async function lastChampion(type: "LEAGUE" | "CHAMPIONS") {
  const rows = await db
    .select({ championId: s.seasons.championId, name: s.seasons.name, year: s.seasons.year })
    .from(s.seasons)
    .innerJoin(s.competitions, eq(s.competitions.id, s.seasons.competitionId))
    .where(and(eq(s.competitions.type, type), isNotNull(s.seasons.championId)))
    .orderBy(desc(s.seasons.year))
    .limit(1);
  return rows[0] ?? null;
}

export async function SuperSeasonAdmin({ seasonId }: { seasonId: string }) {
  const [teams, venues, referees, match, league, cup] = await Promise.all([
    getTeams(),
    getVenues(),
    getReferees(),
    db.query.matches.findFirst({ where: and(eq(s.matches.seasonId, seasonId), eq(s.matches.stage, "FINAL")), with: { homeTeam: true, awayTeam: true } }),
    lastChampion("LEAGUE"),
    lastChampion("CHAMPIONS"),
  ]);
  const name = (id?: string | null) => teams.find((t) => t.id === id)?.name ?? "not set yet";
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="panel p-6">
        <div className="eyebrow mb-2">Season-opening match</div>
        <p className="mb-5 text-sm text-ivory/55">
          Last BOSA League champion: <span className="text-ivory">{league ? `${name(league.championId)} (${league.name})` : "not set yet"}</span>
          <br />
          Last Champions League winner: <span className="text-ivory">{cup ? `${name(cup.championId)} (${cup.name})` : "not set yet"}</span>
          <br />
          <span className="text-xs text-ivory/40">Champions are set on each season&apos;s settings, or automatically when a Champions League final is recorded.</span>
        </p>
        <ActionForm action={scheduleSuperMatchAction} className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="seasonId" value={seasonId} />
          <Field label="League champion">
            <select name="homeTeamId" className="input" defaultValue={match?.homeTeamId ?? league?.championId ?? ""} required>
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
          <Field label="Champions League winner">
            <select name="awayTeamId" className="input" defaultValue={match?.awayTeamId ?? cup?.championId ?? ""} required>
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
          <Field label="Kick-off (Kampala time)">
            <input name="kickoff" type="datetime-local" className="input" required defaultValue={match ? toLocalInput(match.kickoff) : ""} />
          </Field>
          <Field label="Venue">
            <select name="venueId" className="input" defaultValue={match?.venueId ?? venues[0]?.id ?? ""}>
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
          <div className="sm:col-span-2">
            <Submit>{match ? "Update match" : "Schedule match"}</Submit>
          </div>
        </ActionForm>
      </div>
      <div className="panel p-6">
        <div className="eyebrow mb-4">This season&apos;s match</div>
        {match ? (
          <div>
            <div className="flex items-center gap-3">
              <Crest team={match.homeTeam} size={36} />
              <span className="font-serif text-xl">{match.homeTeam?.name}</span>
              <span className="font-display text-2xl">{match.homeScore != null ? `${match.homeScore}-${match.awayScore}` : "v"}</span>
              <span className="font-serif text-xl">{match.awayTeam?.name}</span>
              <Crest team={match.awayTeam} size={36} />
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm text-ivory/55">
              {fmtDateTime(match.kickoff)} <StatusBadge status={match.status} />
            </div>
            <Link href={`/admin/matches/${match.id}`} className="btn-gold btn-sm mt-5">
              Open match console
            </Link>
            <p className="mt-4 text-xs text-ivory/45">Record the result in the console. The winner (including on penalties) becomes this season&apos;s Super Cup champion automatically.</p>
          </div>
        ) : (
          <p className="text-sm text-ivory/50">No match scheduled yet.</p>
        )}
      </div>
    </div>
  );
}
