"use client";

import { useEffect, useState } from "react";
import { ActionForm, Submit } from "@/components/form";
import { Icon, Pill } from "@/components/ui";
import { saveNotificationPrefsAction, sendTestPushAction } from "@/app/actions/notifications";
import { currentSubscription, pushEnv, subscribeDevice, unsubscribeDevice, type PushEnv } from "@/lib/push-client";

export type Prefs = {
  match_reminders: boolean;
  match_results: boolean;
  goals: boolean;
  league_announcements: boolean;
  team_updates: boolean;
  general_notifications: boolean;
};

const PREF_LABELS: [keyof Prefs, string, string][] = [
  ["goals", "Goals and red cards", "Who scored, the moment it's recorded"],
  ["match_results", "Kick-off, half-time and full-time", "Follow the score as each match goes"],
  ["match_reminders", "Match reminders", "A day and an hour before kick-off, plus time changes"],
  ["league_announcements", "League news", "New season, champions crowned, Champions League draw"],
  ["team_updates", "Club updates", "News for your club"],
  ["general_notifications", "General", "Everything else from the League office"],
];

type State = "loading" | "off-server" | "install" | "unsupported" | "denied" | "ready" | "on";

export function PushSettings({ publicKey, prefs }: { publicKey: string | null; prefs: Prefs }) {
  const [state, setState] = useState<State>("loading");
  const [env, setEnv] = useState<PushEnv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const e = pushEnv();
    setEnv(e);
    if (!publicKey) return setState("off-server");
    if (e.needsInstall) return setState("install");
    if (!e.supported) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    const sub = await currentSubscription().catch(() => null);
    setState(sub && Notification.permission === "granted" ? "on" : "ready");
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = async () => {
    setError("");
    setBusy(true);
    try {
      // Must be the first thing after the tap: iPhone only shows the permission prompt for a direct tap
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "ready");
        return;
      }
      await subscribeDevice(publicKey!);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    await unsubscribeDevice();
    setBusy(false);
    setState("ready");
  };

  return (
    <div id="notifications" className="panel scroll-mt-28 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="eyebrow">Match notifications</div>
        {state === "on" && <Pill tone="emerald">On for this device</Pill>}
      </div>

      {state === "loading" && <p className="text-sm text-ivory/45">Checking this device...</p>}

      {state === "off-server" && <p className="text-sm text-ivory/55">Notifications are not switched on for BOSA yet. Check back soon.</p>}

      {state === "install" && (
        <div className="text-sm text-ivory/65">
          <p>On iPhone and iPad, notifications work once BOSA is on your Home Screen (iOS 16.4 or later).</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-ivory/70">
            <li>
              Tap the <span className="text-ivory">Share</span> button in Safari
            </li>
            <li>
              Choose <span className="text-ivory">Add to Home Screen</span>
            </li>
            <li>Open BOSA from your Home Screen and come back to this page</li>
          </ol>
          <button type="button" className="btn-ghost btn-sm mt-4" onClick={() => window.dispatchEvent(new Event("bosa:install"))}>
            Show me how
          </button>
        </div>
      )}

      {state === "unsupported" && (
        <p className="text-sm text-ivory/55">
          This browser can&apos;t show notifications. On Android use Chrome, Samsung Internet, Edge or Firefox. On iPhone, add BOSA to your Home Screen first.
        </p>
      )}

      {state === "denied" && (
        <div className="text-sm text-ivory/65">
          <p>Notifications are blocked for BOSA on this device. To allow them:</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ivory/70">
            {env?.ios ? (
              <li>
                Open <span className="text-ivory">Settings → Notifications → BOSA</span> and turn on Allow Notifications
              </li>
            ) : (
              <li>
                Tap the icon beside the address (or the app&apos;s <span className="text-ivory">Site settings</span>), choose Notifications and set it to Allow
              </li>
            )}
            <li>Then come back and reload this page</li>
          </ul>
        </div>
      )}

      {state === "ready" && (
        <div>
          <p className="text-sm text-ivory/60">Know the moment someone scores. Kick-off, half-time and full-time alerts, plus reminders before every match, even when BOSA is closed.</p>
          <button type="button" onClick={enable} disabled={busy} className="btn-gold mt-4">
            <Icon name="bell" size={16} /> {busy ? "Waiting for your answer..." : "Enable match notifications"}
          </button>
        </div>
      )}

      {state === "on" && (
        <div className="flex flex-wrap gap-2">
          <ActionForm action={sendTestPushAction}>
            <Submit className="btn-ghost btn-sm" pendingText="Sending...">
              Send me a test
            </Submit>
          </ActionForm>
          <button type="button" onClick={disable} disabled={busy} className="btn-quiet btn-sm">
            Turn off on this device
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-crimson-400">{error}</p>}

      {publicKey && (
        <ActionForm action={saveNotificationPrefsAction} className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3 text-xs text-ivory/45">What to notify me about (on all my devices)</div>
          <div className="space-y-1">
            {PREF_LABELS.map(([key, label, hint]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-1 py-2">
                <span className="min-w-0">
                  <span className="block text-sm">{label}</span>
                  <span className="block text-xs text-ivory/45">{hint}</span>
                </span>
                <input type="checkbox" name={key} defaultChecked={prefs[key]} className="h-5 w-5 shrink-0 accent-[#D6B676]" />
              </label>
            ))}
          </div>
          <Submit className="btn-ghost btn-sm mt-4">Save choices</Submit>
        </ActionForm>
      )}
    </div>
  );
}
