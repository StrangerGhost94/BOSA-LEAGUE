import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyEmailToken } from "@/lib/session";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Confirm email", robots: { index: false } };

/** Where the link in the confirmation email lands */
export default async function ConfirmEmail(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams;
  const t = await verifyEmailToken(token);
  const u = t ? await db.query.users.findFirst({ where: eq(users.id, t.uid) }) : null;
  const valid = !!u && u.email === t!.email;
  if (valid && !u.emailVerifiedAt) await db.update(users).set({ emailVerifiedAt: new Date() }).where(and(eq(users.id, u.id), isNull(users.emailVerifiedAt)));
  return (
    <section className="container-x pt-40">
      {valid ? (
        <EmptyState
          title="Email confirmed"
          body={`Thank you, ${u.name.split(/\s+/)[0]}. ${u.email} is confirmed for your BOSA League account.`}
          action={<Link href="/account" className="btn-gold">Go to my account</Link>}
        />
      ) : (
        <EmptyState
          title="This link has expired"
          body="Confirmation links work for 7 days and only for the latest email address on the account. Sign in and send yourself a new link from your account."
          action={<Link href="/account?view=email" className="btn-gold">Send a new link</Link>}
        />
      )}
    </section>
  );
}
