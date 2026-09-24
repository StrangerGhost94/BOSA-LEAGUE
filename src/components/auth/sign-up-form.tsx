"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ActionForm, Field, Submit } from "@/components/form";
import { signUpAction } from "@/app/actions/auth";
import { completionYears } from "@/lib/years";

const TYPES = [
  { v: "ALUMNI_FAN", t: "Old student", d: "Follow the league as a supporter" },
  { v: "PLAYER", t: "Player", d: "Register to play for a club" },
];

export function SignUpForm({ teams }: { teams: { id: string; name: string; intakeYear: number | null }[] }) {
  const [type, setType] = useState("ALUMNI_FAN");
  const [year, setYear] = useState("");
  const [teamId, setTeamId] = useState("");
  const intakeClub = teams.find((t) => String(t.intakeYear) === year);
  const years = completionYears();
  return (
    <ActionForm action={signUpAction} className="mt-10 space-y-5" toast={false}>
      <input type="hidden" name="type" value={type} />
      <div>
        <span className="label">I am joining as</span>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((x) => (
            <button
              type="button"
              key={x.v}
              onClick={() => setType(x.v)}
              className={clsx(
                "relative rounded-xl border px-3 py-3 text-left transition",
                type === x.v ? "border-gold/60 bg-gold/10" : "border-white/10 hover:border-white/25",
              )}
            >
              <span className="block text-sm font-semibold">{x.t}</span>
              <span className="mt-0.5 block text-[11px] text-ivory/45">{x.d}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ivory/45">BOSA League is for old students of Bilal Islamic Institute only.</p>
      </div>
      <Field label="Full name">
        <input name="name" required className="input" placeholder="Your full name" autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email">
          <input name="email" type="email" required className="input" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Phone (for Mobile Money)">
          <input name="phone" className="input" placeholder="07XX XXX XXX" autoComplete="tel" />
        </Field>
      </div>
      <Field label="Year you joined Bilal Institute">
        <select
          name="completionYear"
          className="input"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            const club = teams.find((t) => String(t.intakeYear) === e.target.value);
            if (club) setTeamId(club.id);
          }}
          required
        >
          <option value="" disabled>
            Select the year you joined
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {year && (
          <span className="mt-2 block text-xs text-ivory/55">
            {intakeClub ? (
              <>
                Your intake&apos;s club is <span className="font-semibold text-gold">{intakeClub.name}</span>.
              </>
            ) : (
              "No club has been registered for this intake yet."
            )}
          </span>
        )}
      </Field>
      <AnimatePresence initial={false}>
        {type === "PLAYER" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-5 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
              <div className="text-xs text-ivory/60">Your registration is sent to the League office and your club manager for approval.</div>
              <Field label="Club">
                <select name="teamId" className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!!intakeClub}>
                  <option value="" disabled>
                    Select your club
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.intakeYear ? ` (${t.intakeYear} intake)` : ""}
                    </option>
                  ))}
                </select>
                {intakeClub && <input type="hidden" name="teamId" value={intakeClub.id} />}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position">
                  <select name="position" className="input" defaultValue="MID">
                    <option value="GK">Goalkeeper</option>
                    <option value="DEF">Defender</option>
                    <option value="MID">Midfielder</option>
                    <option value="FWD">Forward</option>
                  </select>
                </Field>
                <Field label="Shirt number">
                  <input name="number" type="number" min={1} max={99} className="input" placeholder="e.g. 10" />
                </Field>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Field label="Password">
        <input name="password" type="password" minLength={8} required className="input" placeholder="At least 8 characters" autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-3 text-sm text-ivory/60">
        <input type="checkbox" name="terms" className="mt-1 accent-[#CC2654]" />
        <span>I confirm I am an old student of Bilal Islamic Institute and agree to the BOSA League membership terms.</span>
      </label>
      <Submit className="btn-primary w-full py-3" pendingText="Creating account">
        Create account
      </Submit>
    </ActionForm>
  );
}
