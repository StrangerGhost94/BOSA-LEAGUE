import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { can } from "@/lib/roles";
import { BosaLogo, Icon } from "@/components/ui";

export const metadata = { title: { default: "Live Desk", template: "%s · Live Desk" } };

/**
 * The Live Desk: a deliberately simple screen for live reporters to run a match from their phone.
 * Admins use the same desk inside the Control Room (/admin/live), so they are sent there.
 */
export default async function LiveDeskLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (me && me.role !== "LIVE_REPORTER" && can(me.role, "results")) redirect("/admin/live");
  const u = await requireRole(["LIVE_REPORTER"], "/live-desk");
  return (
    <div className="min-h-screen bg-night-900 pb-[calc(2rem+var(--safe-bottom))]">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-night-900/90 pt-[var(--safe-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <Link href="/live-desk" className="flex items-center gap-2">
            <BosaLogo size={30} />
            <span className="font-display text-sm tracking-[0.2em]">LIVE DESK</span>
          </Link>
          <span className="ml-auto truncate text-xs text-ivory/45">{u.name}</span>
          <form action="/api/auth/sign-out" method="post">
            <button className="grid h-9 w-9 place-items-center rounded-lg text-ivory/50 active:bg-white/10" aria-label="Sign out">
              <Icon name="logout" size={16} />
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-5">{children}</main>
    </div>
  );
}
