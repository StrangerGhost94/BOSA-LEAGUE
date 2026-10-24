import Link from "next/link";
import { ActionForm, Field, Submit } from "@/components/form";
import { resetPasswordAction } from "@/app/actions/auth";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage(props: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await props.searchParams;
  return (
    <FadeIn>
      <div className="eyebrow mb-4">Account help</div>
      <h1 className="headline text-5xl">New password</h1>
      <p className="mt-3 text-sm text-ivory/55">
        If {email ? <span className="text-ivory">{email}</span> : "that email"} has a BOSA League account, we have sent it a 6-digit code. It works for 15 minutes. Check your spam
        folder too.
      </p>
      <ActionForm action={resetPasswordAction} className="mt-10 space-y-5" toast={false}>
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required defaultValue={email} className="input" />
        </Field>
        <Field label="6-digit code">
          <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required className="input text-center font-display text-2xl tracking-[0.4em]" placeholder="123456" />
        </Field>
        <Field label="New password">
          <input name="password" type="password" autoComplete="new-password" minLength={8} required className="input" placeholder="At least 8 characters" />
        </Field>
        <Field label="New password again">
          <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </Field>
        <Submit className="btn-primary w-full py-3" pendingText="Saving">
          Save and sign in
        </Submit>
      </ActionForm>
      <p className="mt-8 text-sm text-ivory/55">
        No code?{" "}
        <Link href="/forgot-password" className="font-semibold text-gold hover:underline">
          Send a new one
        </Link>
      </p>
    </FadeIn>
  );
}
