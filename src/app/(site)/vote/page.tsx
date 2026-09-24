import { and, asc, notInArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { currentMonth, monthLabel } from "@/lib/members";
import { myVote, pastMonthWinners, tally } from "@/lib/votes";
import { voteMonthAction } from "@/app/actions/members";
import { MembersNav } from "@/components/members-nav";
import { MembersLock } from "@/components/members-lock";
import { VoteForm } from "@/components/vote-form";
import { VoteResults } from "@/components/vote-results";

export const metadata = { title: "Vote" };

export default async function VotePage() {
  const u = await getCurrentUser();
  const member = hasMembership(u);
  const month = currentMonth();
  const [teams, players, rows, mine, past] = await Promise.all([
    db.query.teams.findMany({ orderBy: asc(s.teams.name) }),
    db.query.players.findMany({ where: and(notInArray(s.players.status, ["PENDING", "REJECTED"])), orderBy: [asc(s.players.firstName)] }),
    member ? tally({ month }) : Promise.resolve([]),
    member && u ? myVote(u.id, { month }) : Promise.resolve(null),
    pastMonthWinners(),
  ]);
  const grouped = teams.map((t) => ({ id: t.id, name: t.name, players: players.filter((p) => p.teamId === t.id).map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`.trim() })) }));
  const earlier = past.filter((p) => p.month !== month);

  return (
    <section className="container-x pt-24 sm:pt-32">
      <MembersNav active="/vote" />
      <div className="mt-8">
        <div className="eyebrow">Members&apos; vote</div>
        <h1 className="headline mt-3 text-5xl sm:text-6xl">
          Player of the month <em className="gold-text">· {monthLabel(month)}</em>
        </h1>
        <p className="mt-4 max-w-2xl text-ivory/60">One vote per member each month. You can change your vote until the month ends. Vote for player of the match on each match page after the final whistle.</p>
      </div>
      {!member ? (
        <div className="mt-10">
          <MembersLock title="Members choose the player of the month" body="Every member gets a vote each month, plus a vote for the fans' player of the match after every game." signedIn={!!u} />
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="panel p-6">
            <div className="eyebrow mb-5">{mine ? "Your vote is in" : "Cast your vote"}</div>
            <VoteForm action={voteMonthAction} teams={grouped} current={mine} />
            <p className="mt-4 text-xs text-ivory/40">Players appear here once their club has registered them and the League office has approved them.</p>
          </div>
          <div className="panel p-6">
            <div className="eyebrow mb-5">Standings this month</div>
            <VoteResults rows={rows} mine={mine} />
          </div>
        </div>
      )}
      {earlier.length > 0 && (
        <div className="mt-16">
          <div className="eyebrow mb-5">Previous winners</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {earlier.map((w) => (
              <div key={w.month} className="panel p-5">
                <div className="text-[11px] uppercase tracking-[0.2em] text-gold">{monthLabel(w.month)}</div>
                <div className="mt-2 flex items-center gap-2">
                  <img src={w.crest} alt="" className="h-7 w-7 rounded-full bg-white" />
                  <span className="font-serif text-xl">{w.name}</span>
                </div>
                <div className="mt-1 text-xs text-ivory/45">{w.teamName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
