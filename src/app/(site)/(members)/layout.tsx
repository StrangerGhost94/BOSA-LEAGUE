import { getCurrentUser, hasMembership } from "@/lib/auth";
import { getMembershipPrice } from "@/lib/data";
import { ugx } from "@/lib/format";
import { MembersLock } from "@/components/members-lock";

/**
 * Everything in this folder (tables, fixtures, results, clubs, players, news, gallery, votes, rules)
 * is for members only. Staff count as members. Everyone else sees one clear lock with the way in.
 * The URLs are unchanged: a (group) folder does not appear in the address.
 */
export default async function MembersOnlyLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (hasMembership(u)) return <>{children}</>;
  const price = await getMembershipPrice();
  return (
    <section className="container-x pb-16 pt-28 sm:pb-24 sm:pt-36">
      <MembersLock
        title="For BOSA League members"
        body={`Tables, fixtures, results, clubs, players and news are open to members. Membership is a one-time ${ugx(price)}: buy a voucher and enter the code.`}
        signedIn={!!u}
      />
    </section>
  );
}
