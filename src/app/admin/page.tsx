import Link from "next/link";
import { pool } from "@/db";
import { requireUser } from "@/lib/auth";
import { getCurrentSeason, getMatches, getSeasonTable, getMembershipPrice } from "@/lib/data";
import { PageHeader } from "@/components/panel-shell";
import { CountUp, Stagger, StaggerItem } from "@/components/motion";
import { Crest, Icon, StatTile, StatusBadge, Pill } from "@/components/ui";
import { fmtDate, fmtTime, timeAgo, ugx } from "@/lib/format";
import { ROLE_LABEL, can } from "@/lib/roles";
import { db } from "@/db";
import { desc } from "drizzle-orm";
import { activityLogs } from "@/db/schema";

export default async function AdminHome() {
  const u = await requireUser();
  const lg = await getCurrentSeason("bosa-league");
  const owner = can(u.role, "payments");
  const [{ rows }, upcoming, table, activity, price, pendingPlayers] = await Promise.all([
    pool.query(`select
      (select count(*) from users where membership='ACTIVE' and role in ('STUDENT_FAN','ALUMNI_FAN','PLAYER'))::int members,
      (select count(*) from users)::int users,
      (select coalesce(sum(amount),0) from payments where status='COMPLETED' and provider not in ('DEMO','MANUAL'))::int online,
      (select count(*) from vouchers where status='USED')::int vouchers,
      (select count(*) from teams where active)::int clubs,
      (select count(*) from players where status<>'REJECTED')::int players,
      (select count(*) from players where status='PENDING')::int pending,
      (select count(*) from players where status in ('INJURED','SUSPENDED'))::int unavailable,
      (select count(*) from matches where status in ('LIVE','HALF_TIME'))::int live,
      (select count(*) from matches where status='SCHEDULED' and kickoff < now() + interval '7 days' and kickoff > now() - interval '1 day')::int week`),
    getMatches({ status: "upcoming", limit: 8, from: new Date(Date.now() - 1000 * 60 * 60 * 24) }),
    lg ? getSeasonTable(lg.id) : Promise.resolve([]),
    owner ? db.query.activityLogs.findMany({ with: { user: true }, orderBy: desc(activityLogs.createdAt), limit: 8 }) : Promise.resolve([]),
    getMembershipPrice(),
    pool.query("select p.id, p.first_name, p.last_name, p.position, p.number, t.name team, t.crest from players p join teams t on t.id=p.team_id where p.status='PENDING' order by p.created_at desc limit 5"),
  ]);
  const k = rows[0];
  const live = await getMatches({ status: "live" });

  return (
    <>
      <PageHeader eyebrow={`Welcome back, ${u.name.split(" ")[0]}`} title="Matchday control">
        <Link href="/admin/fixtures?new=1" className="btn-primary btn-sm">
          <Icon name="plus" size={14} /> Schedule fixture
        </Link>
        <Link href="/admin/news/new" className="btn-ghost btn-sm">
          <Icon name="news" size={14} /> Publish news
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {owner ? (
          <>
            <StatTile label="Active members" hint={`${k.users} accounts in total`}><CountUp value={k.members} /></StatTile>
            <StatTile label="Membership revenue" hint={`${k.vouchers} vouchers at ${ugx(price)}`} accent="emerald">
              <span className="text-3xl sm:text-4xl">UGX <CountUp value={k.vouchers * price + k.online} /></span>
            </StatTile>
          </>
        ) : (
          <>
            <StatTile label="Clubs"><CountUp value={k.clubs} /></StatTile>
            <StatTile label="Registered players" accent="emerald"><CountUp value={k.players} /></StatTile>
          </>
        )}
        <StatTile label="Matches this week" hint={`${k.live} live now`} accent="crimson"><CountUp value={k.week} /></StatTile>
        <StatTile label="Awaiting approval" hint={`${k.unavailable} injured or suspended`}><CountUp value={k.pending} /></StatTile>
      </div>

      {live.length > 0 && (
        <div className="mt-8 rounded-2xl border border-crimson/40 bg-crimson/10 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-crimson-400">
            <span className="h-2 w-2 animate-pulseDot rounded-full bg-crimson-400" /> Live now
          </div>
          {live.map((m) => (
            <Link key={m.id} href={`/admin/matches/${m.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
              <Crest team={m.homeTeam} size={26} /> <span className="font-semibold">{m.homeTeam?.name}</span>
              <span className="font-display text-xl">{m.homeScore}-{m.awayScore}</span>
              <span className="font-semibold">{m.awayTeam?.name}</span> <Crest team={m.awayTeam} size={26} />
              <span className="ml-auto text-sm text-gold">Open console</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="eyebrow">Next fixtures</div>
            <Link href="/admin/fixtures" className="text-xs text-ivory/50 hover:text-gold">All fixtures</Link>
          </div>
          <Stagger className="space-y-1">
            {upcoming.map((m) => (
              <StaggerItem key={m.id}>
                <Link href={`/admin/matches/${m.id}`} className="group grid grid-cols-[88px_1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]">
                  <span className="text-xs">
                    <span className="block text-gold">{fmtDate(m.kickoff, { day: "numeric", month: "short" })}</span>
                    <span className="text-ivory/45">{fmtTime(m.kickoff)}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Crest team={m.homeTeam} size={22} />
                    <span className="truncate">{m.homeTeam?.name ?? "TBD"}</span>
                    <span className="text-ivory/30">v</span>
                    <span className="truncate">{m.awayTeam?.name ?? "TBD"}</span>
                    <Crest team={m.awayTeam} size={22} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="hidden text-[10px] uppercase tracking-[0.14em] text-ivory/35 md:inline">{m.season.competition.shortName}</span>
                    <StatusBadge status={m.status} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
        <div className="space-y-6">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="eyebrow">Registrations to review</div>
              <Link href="/admin/players?status=PENDING" className="text-xs text-ivory/50 hover:text-gold">Review all</Link>
            </div>
            {pendingPlayers.rows.length === 0 && <p className="text-sm text-ivory/45">All registrations are up to date.</p>}
            <ul className="space-y-2">
              {pendingPlayers.rows.map((p: { id: string; first_name: string; last_name: string; team: string; crest: string; position: string; number: number }) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <img src={p.crest} alt="" className="h-7 w-7 rounded-full bg-white" />
                  <span className="flex-1">
                    {p.first_name} {p.last_name} <span className="text-ivory/40">#{p.number || "–"} {p.position}</span>
                  </span>
                  <Pill tone="gold">Pending</Pill>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <div className="eyebrow mb-4">League summit</div>
            {table.slice(0, 5).map((r) => (
              <div key={r.teamId} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-4 font-display text-ivory/50">{r.position}</span>
                <Crest team={r.team} size={22} />
                <span className="flex-1">{r.team.name}</span>
                <span className="font-display">{r.points}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {owner && <div className="panel mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="eyebrow">Recent activity</div>
          <Link href="/admin/activity" className="text-xs text-ivory/50 hover:text-gold">Full history</Link>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {activity.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="font-semibold">{a.action}</span>
              {a.details && <span className="text-ivory/55">{a.details}</span>}
              <span className="ml-auto text-xs text-ivory/40">
                {a.user ? `${a.user.name} (${ROLE_LABEL[a.user.role]})` : "System"} · {timeAgo(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>}
    </>
  );
}
