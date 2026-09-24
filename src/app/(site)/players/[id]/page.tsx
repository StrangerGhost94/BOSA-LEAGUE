import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, or, desc } from "drizzle-orm";
import { db } from "@/db";
import { players, matchEvents } from "@/db/schema";
import { getPlayerStats } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { CountUp, FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Crest, Pill, StatTile } from "@/components/ui";
import { MembersLock } from "@/components/members-lock";
import { POSITION_LABEL, fmtDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const p = await db.query.players.findFirst({ where: eq(players.id, params.id) });
  return { title: p ? `${p.firstName} ${p.lastName}` : "Player" };
}

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const p = await db.query.players.findFirst({ where: eq(players.id, params.id), with: { team: true } });
  if (!p || p.status === "REJECTED") notFound();
  const [stats] = await getPlayerStats({ playerId: p.id, includePending: true });
  const user = await getCurrentUser();
  const member = hasMembership(user);
  const events = await db.query.matchEvents.findMany({
    where: or(eq(matchEvents.playerId, p.id), eq(matchEvents.assistId, p.id)),
    with: { match: { with: { homeTeam: true, awayTeam: true, season: { with: { competition: true } } } } },
    orderBy: desc(matchEvents.createdAt),
    limit: 40,
  });
  const t = p.team;
  const statusPill = p.status === "ACTIVE" ? <Pill tone="emerald">Available</Pill> : p.status === "PENDING" ? <Pill tone="gold">Registration pending</Pill> : p.status === "INJURED" ? <Pill tone="gold">Injured</Pill> : <Pill tone="crimson">Suspended</Pill>;

  return (
    <>
      <section className="relative overflow-hidden pb-14 pt-36">
        <div className="absolute inset-0" style={{ background: `radial-gradient(80% 90% at 85% 30%, ${t.primaryColor} 0%, #0A0F1E 55%, #060913 100%)` }} />
        <div className="pointer-events-none absolute -right-10 top-16 select-none font-display text-[340px] font-bold leading-none text-white/[0.05] sm:text-[460px]">{p.number || "–"}</div>
        <div className="container-x relative">
          <FadeIn>
            <Link href={`/teams/${t.slug}`} className="inline-flex items-center gap-3 text-sm text-ivory/70 hover:text-ivory">
              <Crest team={t} size={36} /> {t.name}
            </Link>
            <h1 className="headline mt-6 text-6xl sm:text-8xl">
              {p.firstName}
              <br />
              <em className="gold-text">{p.lastName}</em>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ivory/60">
              <span className="font-display text-2xl text-ivory">#{p.number || "–"}</span>
              <span>{POSITION_LABEL[p.position]}</span>
              <span className="h-1 w-1 rounded-full bg-gold/60" />
              <span>{p.affiliation === "ALUMNI" ? "Alumni" : "Student"}</span>
              {p.course && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gold/60" />
                  <span>{p.course}</span>
                </>
              )}
              {p.yearOfStudy && <span className="text-ivory/40">({p.yearOfStudy})</span>}
              {statusPill}
            </div>
            {p.statusNote && p.status !== "ACTIVE" && (
              <p className="mt-3 text-sm text-gold">
                {p.statusNote}
                {p.statusUntil ? ` · expected back ${fmtDate(p.statusUntil, { day: "numeric", month: "long" })}` : ""}
              </p>
            )}
          </FadeIn>
        </div>
      </section>

      <section className="container-x">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
          <StatTile label="Appearances"><CountUp value={stats?.apps ?? 0} /></StatTile>
          <StatTile label="Goals" accent="crimson"><CountUp value={stats?.goals ?? 0} /></StatTile>
          <StatTile label="Assists"><CountUp value={stats?.assists ?? 0} /></StatTile>
          <StatTile label="Clean sheets" accent="emerald">{p.position === "GK" ? <CountUp value={stats?.cleanSheets ?? 0} /> : "-"}</StatTile>
          <StatTile label="Yellow cards"><CountUp value={stats?.yellows ?? 0} /></StatTile>
          <StatTile label="Red cards" accent="crimson"><CountUp value={stats?.reds ?? 0} /></StatTile>
          <StatTile label="Player of match"><CountUp value={stats?.potm ?? 0} /></StatTile>
        </div>
      </section>

      <section className="container-x pt-14">
        {member ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div className="panel p-7">
              <div className="eyebrow mb-5">Profile</div>
              <dl className="grid grid-cols-2 gap-6 text-sm">
                <div><dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">Club</dt><dd className="mt-1">{t.name}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">Campus</dt><dd className="mt-1">{t.campus}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">Position</dt><dd className="mt-1">{POSITION_LABEL[p.position]}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">Starts</dt><dd className="mt-1">{stats?.starts ?? 0}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">Born</dt><dd className="mt-1">{p.birthYear ?? "-"}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">Goals per app</dt><dd className="mt-1">{stats?.apps ? (stats.goals / stats.apps).toFixed(2) : "0.00"}</dd></div>
              </dl>
              {p.bio && <p className="mt-6 text-sm text-ivory/60">{p.bio}</p>}
            </div>
            <div className="panel p-7">
              <div className="eyebrow mb-5">Goal involvements</div>
              {events.filter((e) => e.type !== "SUB").length === 0 && <p className="text-sm text-ivory/45">No goals, assists or cards recorded yet.</p>}
              <Stagger as="ul" className="space-y-2">
                {events
                  .filter((e) => e.type !== "SUB")
                  .map((e) => {
                    const m = e.match;
                    const assist = e.assistId === p.id;
                    const label = assist ? "Assist" : e.type === "YELLOW" ? "Yellow card" : e.type === "RED" || e.type === "SECOND_YELLOW" ? "Red card" : e.type === "OWN_GOAL" ? "Own goal" : e.type === "PENALTY_GOAL" ? "Penalty goal" : e.type === "PENALTY_MISS" ? "Penalty missed" : "Goal";
                    return (
                      <StaggerItem as="li" key={e.id + (assist ? "a" : "")}>
                        <Link href={`/matches/${m.id}`} className="flex items-center gap-4 rounded-xl border border-white/[0.05] px-4 py-3 text-sm transition hover:border-gold/30">
                          <span className="w-10 font-display text-gold">{e.minute}&apos;</span>
                          <span className="w-28 text-xs uppercase tracking-[0.12em] text-ivory/60">{label}</span>
                          <span className="flex-1 truncate">
                            {m.homeTeam?.name} {m.homeScore}-{m.awayScore} {m.awayTeam?.name}
                          </span>
                          <span className="hidden text-xs text-ivory/40 sm:block">{m.season.competition.shortName}</span>
                        </Link>
                      </StaggerItem>
                    );
                  })}
              </Stagger>
            </div>
          </div>
        ) : (
          <MembersLock title="Full player profile" body="Members see every goal, assist and card with match links, plus complete profile details." signedIn={!!user} />
        )}
      </section>
    </>
  );
}
