import Link from "next/link";
import { Icon } from "@/components/ui";

export function MembersLock({ title = "Members-only content", body = "Activate your one-time BOSA League membership to unlock the full match centre, line-ups, player profiles and members-only stories.", signedIn }: { title?: string; body?: string; signedIn: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-gold/[0.07] to-transparent p-8 text-center">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(214,182,118,0.26),rgba(214,182,118,0))]" />
      <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold/40 text-gold">
        <Icon name="lock" />
      </div>
      <h3 className="relative mt-4 font-serif text-2xl">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-md text-sm text-ivory/60">{body}</p>
      <div className="relative mt-6 flex justify-center gap-3">
        <Link href="/membership" className="btn-gold">
          Become a member
        </Link>
        {!signedIn && (
          <Link href="/sign-in" className="btn-ghost">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
