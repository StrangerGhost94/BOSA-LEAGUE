import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { perks, teams } from "@/db/schema";
import { requireUser, hasMembership } from "@/lib/auth";
import { cardCode, ensureMemberNumber, formatMemberNumber } from "@/lib/members";
import { MembersNav } from "@/components/members-nav";
import { BosaLogo, Crest } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { ROLE_LABEL, isStaff } from "@/lib/roles";
import Link from "next/link";
import { fmtLong } from "@/lib/format";
import { CardActions } from "@/components/card-actions";

export const metadata = { title: "Member card" };

export default async function CardPage() {
  const u = await requireUser("/members/card");
  if (!hasMembership(u)) redirect("/membership");
  const n = await ensureMemberNumber(u.id);
  const code = cardCode(n);
  const base = process.env.APP_URL || "";
  const verifyUrl = `${base}/verify/${code}`;
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 1, color: { dark: "#0A0F1E", light: "#FFFFFF" } });
  // Old students belong to the club of the year they joined Bilal Institute
  const club = u.team ?? (u.completionYear ? await db.query.teams.findFirst({ where: eq(teams.intakeYear, u.completionYear) }) : null);
  const offers = await db.query.perks.findMany({ where: eq(perks.active, true), orderBy: asc(perks.order) });

  return (
    <section className="container-x pt-24 sm:pt-32">
      <MembersNav active="/members/card" />
      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,480px)_1fr]">
        <FadeIn>
          <div
            id="member-card"
            className="relative aspect-[1.586/1] w-full overflow-hidden rounded-[1.4rem] p-5 text-ivory shadow-[0_40px_100px_-30px_rgba(204,38,84,.6)] sm:p-7"
            style={{ background: "linear-gradient(125deg, #A91C44 0%, #6E1230 38%, #1B2033 72%, #0A0F1E 100%)" }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[1.4rem] ring-1 ring-inset ring-gold/40" />
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 opacity-10">
              <BosaLogo size={220} />
            </div>
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <BosaLogo size={38} />
                  <div className="leading-none">
                    <div className="font-display text-sm tracking-[0.16em]">BOSA LEAGUE</div>
                    <div className="mt-1 text-[8px] uppercase tracking-[0.3em] text-gold-300">Official member</div>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-1" dangerouslySetInnerHTML={{ __html: qr }} style={{ width: 76, height: 76 }} />
              </div>
              <div className="mt-auto">
                <div className="font-serif text-2xl leading-tight sm:text-3xl">{u.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] uppercase tracking-[0.16em] text-ivory/70">
                  <span>{u.completionYear ? `${u.completionYear} intake` : ROLE_LABEL[u.role]}</span>
                  {club && (
                    <span className="flex items-center gap-1.5">
                      <Crest team={club} size={16} ring={false} /> {club.name}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.3em] text-gold-300">Member number</div>
                    <div className="font-display text-xl tracking-[0.12em]">{formatMemberNumber(n)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] uppercase tracking-[0.3em] text-gold-300">Member since</div>
                    <div className="text-xs">{u.membershipPaidAt ? fmtLong(u.membershipPaidAt).replace(/^\w+, /, "") : u.membership === "ACTIVE" && !isStaff(u.role) ? "Founding member" : "Staff"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <CardActions />
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="eyebrow">Your digital member card</div>
          <h1 className="headline mt-4 text-4xl sm:text-5xl">Show it. Save it. Use it.</h1>
          <p className="mt-4 max-w-lg text-ivory/60">
            Partner businesses scan the QR code to confirm you are an active BOSA League member. Keep this page on your phone&apos;s home screen, or take a screenshot of the card.
          </p>
          <div className="mt-8">
            <div className="eyebrow mb-4">Member offers</div>
            {offers.length === 0 && <p className="text-sm text-ivory/50">Partner offers will appear here as they are announced.</p>}
            <Link href="/members/perks" className="btn-ghost btn-sm mt-4">
              All member perks
            </Link>
            <div className="space-y-3">
              {offers.map((o) => (
                <div key={o.id} className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-gold">{o.sponsor}</div>
                  <div className="mt-1 font-serif text-lg">{o.offer}</div>
                  {o.details && <p className="mt-1 text-sm text-ivory/55">{o.details}</p>}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
