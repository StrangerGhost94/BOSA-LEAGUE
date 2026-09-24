"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ActionForm, Field, Submit } from "@/components/form";
import { signUpAction } from "@/app/actions/auth";

const TYPES = [
  { v: "STUDENT_FAN", t: "Student fan", d: "Currently enrolled" },
  { v: "ALUMNI_FAN", t: "Alumni fan", d: "Graduated supporter" },
  { v: "PLAYER", t: "Player", d: "Register with a club" },
];

export function SignUpForm({ teams }: { teams: { id: string; name: string }[] }) {
  const [type, setType] = useState("STUDENT_FAN");
  return (
    <ActionForm action={signUpAction} className="mt-10 space-y-5" toast={false}>
      <input type="hidden" name="type" value={type} />
      <div>
        <span className="label">Account type</span>
        <div className="grid grid-cols-3 gap-2">
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
      </div>
      <Field label="Full name">
        <input name="name" required className="input" placeholder="e.g. Aisha Namutebi" autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email">
          <input name="email" type="email" required className="input" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Phone (for Mobile Money)">
          <input name="phone" className="input" placeholder="07XX XXX XXX" autoComplete="tel" />
        </Field>
      </div>
      <Field label="University or institute">
        <input name="university" className="input" placeholder="e.g. Makerere University" />
      </Field>
      <AnimatePresence initial={false}>
        {type === "PLAYER" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-5 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
              <div className="text-xs text-ivory/60">Your registration is sent to the League office and your club manager for approval.</div>
              <Field label="Club">
                <select name="teamId" className="input" defaultValue="">
                  <option value="" disabled>
                    Select your club
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Position">
                  <select name="position" className="input" defaultValue="MID">
                    <option value="GK">GK</option>
                    <option value="DEF">DEF</option>
                    <option value="MID">MID</option>
                    <option value="FWD">FWD</option>
                  </select>
                </Field>
                <Field label="Number">
                  <input name="number" type="number" min={1} max={99} className="input" defaultValue={23} />
                </Field>
                <Field label="Status">
                  <select name="affiliation" className="input" defaultValue="STUDENT">
                    <option value="STUDENT">Student</option>
                    <option value="ALUMNI">Alumni</option>
                  </select>
                </Field>
              </div>
              <Field label="Course">
                <input name="course" className="input" placeholder="e.g. BSc Computer Science" />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Field label="Password">
        <input name="password" type="password" minLength={8} required className="input" placeholder="At least 8 characters" autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-3 text-sm text-ivory/60">
        <input type="checkbox" name="terms" className="mt-1 accent-[#CC2654]" />
        <span>I agree to the BOSA League membership terms and the competition code of conduct.</span>
      </label>
      <Submit className="btn-primary w-full py-3" pendingText="Creating account">
        Create account
      </Submit>
    </ActionForm>
  );
}
