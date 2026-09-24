import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { parseCardCode, formatMemberNumber } from "@/lib/members";
import { BosaLogo, Icon } from "@/components/ui";
import { hasMembership } from "@/lib/auth";

export const metadata = { title: "Verify member", robots: { index: false } };

/** Page a sponsor lands on after scanning a member card's QR code. */
export default async function VerifyPage({ params }: { params: { code: string } }) {
  const n = parseCardCode(decodeURIComponent(params.code));
  const u = n ? await db.query.users.findFirst({ where: eq(users.memberNumber, n) }) : null;
  const valid = !!u && u.active && hasMembership(u);
  return (
    <section className="container-x flex min-h-[80vh] items-center justify-center pt-24">
      <div className={`w-full max-w-md rounded-3xl border p-8 text-center ${valid ? "border-emerald/40 bg-emerald/10" : "border-crimson/40 bg-crimson/10"}`}>
        <BosaLogo size={56} className="mx-auto" />
        <div className={`mx-auto mt-6 grid h-16 w-16 place-items-center rounded-full ${valid ? "bg-emerald text-white" : "bg-crimson text-white"}`}>
          <Icon name={valid ? "check" : "close"} size={30} />
        </div>
        <h1 className="headline mt-5 text-3xl">{valid ? "Valid member" : "Not a valid card"}</h1>
        {valid && u ? (
          <div className="mt-4 space-y-1 text-ivory/80">
            <div className="font-serif text-2xl">{u.name}</div>
            <div className="text-sm">{u.completionYear ? `Class of ${u.completionYear} · ` : ""}{formatMemberNumber(n!)}</div>
            <div className="text-xs text-ivory/50">Checked {new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", dateStyle: "medium", timeStyle: "short" }).format(new Date())}</div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ivory/60">This card could not be confirmed. The membership may have ended or the code is not genuine.</p>
        )}
      </div>
    </section>
  );
}
