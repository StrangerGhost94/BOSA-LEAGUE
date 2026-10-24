import Link from "next/link";
import { getTeams } from "@/lib/data";

/** Plain-language summary of the league, visible to everyone: helps new visitors and tells Google what the site is about */
export async function AboutBosa({ className = "" }: { className?: string }) {
  const clubs = (await getTeams()).filter((t) => t.active).sort((a, b) => (a.intakeYear ?? 0) - (b.intakeYear ?? 0));
  return (
    <section className={`container-x ${className}`} aria-labelledby="about-bosa">
      <div className="mx-auto max-w-3xl border-t border-white/[0.06] pt-10 text-sm leading-relaxed text-ivory/60">
        <h2 id="about-bosa" className="font-serif text-2xl text-ivory/90">
          About the BOSA League
        </h2>
        <p className="mt-4">
          The BOSA League is the football league of the old students of Bilal Institute. Each club is made up of one intake year, so former classmates play
          together again every Sunday at Henry&apos;s Pitch, Kabalagala, in Kampala, Uganda.
        </p>
        <p className="mt-3">
          The season has three competitions: the <Link href="/league" className="text-gold hover:underline">BOSA League</Link>, the{" "}
          <Link href="/champions-league" className="text-gold hover:underline">BOSA Champions League</Link> and the{" "}
          <Link href="/super-cup" className="text-gold hover:underline">BOSA Super Cup</Link>. This site carries the fixtures, results, league table, top
          scorers, live scores and news for all of them.
        </p>
        {clubs.length > 0 && (
          <p className="mt-3">
            The {clubs.length} clubs: {clubs.map((c) => c.name).join(", ")}.
          </p>
        )}
        <p className="mt-3">
          Old students, families and friends can <Link href="/membership" className="text-gold hover:underline">become members</Link> for live match updates,
          goal alerts on their phone, a digital member card and partner perks.
        </p>
      </div>
    </section>
  );
}
