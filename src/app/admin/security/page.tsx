import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Submit } from "@/components/form";
import { EmptyState, Pill } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { getSharingFlags, recentSignIns } from "@/lib/security";
import { fmtDateTime } from "@/lib/format";
import { formatMemberNumber } from "@/lib/members";
import { setAccountSuspendedAction, signOutEverywhereAction } from "@/app/actions/admin";

export const metadata = { title: "Account sharing" };

export default async function SecurityPage() {
  await requirePermission("sharing");
  const flags = await getSharingFlags();
  const history = await Promise.all(flags.map((f) => recentSignIns(f.id, 8)));

  return (
    <>
      <PageHeader eyebrow="Last 7 days" title="Account sharing" />
      <div className="panel mb-8 p-5 text-sm leading-relaxed text-ivory/65">
        Members can use one phone at a time: signing in on a new phone signs the old one out. An account used by several people keeps switching between phones, so it shows up here.
        Staff accounts are never listed. <span className="text-ivory">Sign out everywhere</span> ends every session; <span className="text-ivory">Suspend</span> stops the account signing in
        until you restore it.
      </div>

      {flags.length === 0 && <EmptyState title="No signs of sharing" body="No member account has been used on several phones in the last 7 days." />}

      <div className="space-y-4">
        {flags.map((f, i) => (
          <div key={f.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-xl">{f.name}</span>
                  {f.active ? <Pill tone="gold">Possible shared account</Pill> : <Pill tone="crimson">Suspended</Pill>}
                </div>
                <div className="mt-1 break-all text-xs text-ivory/50">
                  {f.email}
                  {f.memberNumber ? ` · ${formatMemberNumber(f.memberNumber)}` : ""} · last sign-in {fmtDateTime(f.lastAt)}
                </div>
                <div className="mt-2 text-sm text-crimson-400">{f.reasons.join(" · ")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={signOutEverywhereAction}>
                  <input type="hidden" name="userId" value={f.id} />
                  <Submit className="btn-ghost btn-sm">Sign out everywhere</Submit>
                </ActionForm>
                <ActionForm action={setAccountSuspendedAction} confirm={f.active ? `Suspend ${f.name}? They will be signed out and unable to sign in until restored.` : undefined}>
                  <input type="hidden" name="userId" value={f.id} />
                  <input type="hidden" name="suspend" value={f.active ? "1" : "0"} />
                  <Submit className={f.active ? "btn-danger btn-sm" : "btn-gold btn-sm"}>{f.active ? "Suspend" : "Restore"}</Submit>
                </ActionForm>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs sm:max-w-md">
              {[
                ["Devices", f.devices],
                ["Switches", f.switches],
                ["Sign-ins", f.signIns],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-white/[0.03] py-2">
                  <div className="font-display text-lg">{v}</div>
                  <div className="text-ivory/40">{l}</div>
                </div>
              ))}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-gold">Recent sign-ins</summary>
              <ul className="mt-3 divide-y divide-white/[0.05] text-xs">
                {history[i].map((h, k) => (
                  <li key={k} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{h.device_label}</span>
                    <span className="text-ivory/45">
                      {h.ip ?? "unknown network"} · {fmtDateTime(h.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>
    </>
  );
}
