import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { perks, teams } from "@/db/schema";
import { requireUser, hasMembership } from "@/lib/auth";
import { cardCode, ensureMemberNumber, membershipId } from "@/lib/members";
import { isStaff } from "@/lib/roles";
import { MembersNav } from "@/components/members-nav";
import { MemberCard, type CardData } from "@/components/member-card";

export const metadata = { title: "Member card" };

export default async function CardPage() {
  const u = await requireUser("/members/card");
  if (!hasMembership(u)) redirect("/membership");
  const n = await ensureMemberNumber(u.id);
  const code = cardCode(n);
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const qr = await QRCode.toString(`${base}/verify/${code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0A0F1E", light: "#FFFFFF" } });
  // Old students belong to the club of the year they joined Bilal Institute
  const club = u.team ?? (u.completionYear ? await db.query.teams.findFirst({ where: eq(teams.intakeYear, u.completionYear) }) : null);
  const offers = await db.query.perks.findMany({ where: eq(perks.active, true), orderBy: asc(perks.order) });
  const joined = u.membershipPaidAt ?? u.createdAt;
  const id = membershipId(n, joined);
  const since = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", month: "short", year: "numeric" }).format(joined).toUpperCase();

  const d: CardData = {
    name: u.name,
    memberId: id,
    cardCode: code,
    tier: isStaff(u.role) ? "Official" : "Premium",
    intake: u.completionYear ? `${u.completionYear} intake` : null,
    club: club ? { name: club.name, crest: club.crest } : null,
    since,
    qrSvg: qr,
    verifyHost: base.replace(/^https?:\/\//, "") || "bosa-league",
  };

  const rows: [string, string][] = [
    ["Membership ID", id],
    ["Status", "Active · lifetime"],
    ["Club", club ? club.name : "Not linked yet"],
    ["Intake", u.completionYear ? String(u.completionYear) : "Not set"],
    ["Member since", since],
  ];

  return (
    <section className="container-x pb-10 pt-20 sm:pt-28">
      <MembersNav active="/members/card" />
      <div className="mx-auto mt-6 grid max-w-5xl items-start gap-8 lg:mt-10 lg:grid-cols-[440px_1fr] lg:gap-12">
        <MemberCard d={d} fileName={`BOSA-member-card-${id.replace(/\s+/g, "")}.png`} />

        <div className="min-w-0">
          <div className="eyebrow">Your digital member card</div>
          <h1 className="headline mt-3 text-3xl sm:text-4xl">{u.name}</h1>
          <dl className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-night-800/50">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-ivory/50">{k}</dt>
                <dd className={k === "Membership ID" ? "font-mono font-semibold tracking-wide text-gold" : "text-right"}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ivory/50">
            Your Membership ID is yours for life. Partners scan the QR code on the back of the card to confirm you are an active member. Download the card to keep it in your photos for when you have no data.
          </p>

          <div className="mt-8 flex items-center justify-between">
            <div className="eyebrow">Member offers</div>
            <Link href="/members/perks" className="text-xs font-semibold text-gold hover:text-gold-300">
              All perks
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {offers.length === 0 && <p className="text-sm text-ivory/50">Partner offers will appear here as they are announced.</p>}
            {offers.map((o) => (
              <div key={o.id} className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-gold">{o.sponsor}</div>
                <div className="mt-1 font-serif text-lg">{o.offer}</div>
                {o.details && <p className="mt-1 text-sm text-ivory/55">{o.details}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
