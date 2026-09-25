"use client";

import { useState } from "react";
import { ActionForm, Field, Submit } from "@/components/form";
import { signUpAction } from "@/app/actions/auth";
import { completionYears } from "@/lib/years";

export function SignUpForm({ teams }: { teams: { id: string; name: string; intakeYear: number | null }[] }) {
  const [year, setYear] = useState("");
  const intakeClub = teams.find((t) => String(t.intakeYear) === year);
  const years = completionYears();
  return (
    <ActionForm action={signUpAction} className="mt-10 space-y-5" toast={false}>
      <p className="text-xs text-ivory/45">BOSA League is for old students of Bilal Islamic Institute only.</p>
      <Field label="Full name">
        <input name="name" required className="input" placeholder="Your full name" autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email">
          <input name="email" type="email" required className="input" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Phone number">
          <input name="phone" className="input" placeholder="07XX XXX XXX" autoComplete="tel" />
        </Field>
      </div>
      <Field label="Year you joined Bilal Institute">
        <select
          name="completionYear"
          className="input"
          value={year}
          onChange={(e) => setYear(e.target.value)}
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
      <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
        <Field label="Membership voucher (optional)">
          <input name="voucher" className="input text-center font-mono uppercase tracking-[0.16em]" placeholder="BOSA-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </Field>
        <p className="mt-2 text-xs text-ivory/55">Bought a voucher? Enter it here and your account opens as a full member. No voucher yet? Leave it empty and add it later.</p>
      </div>
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
