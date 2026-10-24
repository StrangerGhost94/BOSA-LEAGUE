import Link from "next/link";
import { ActionForm, Field, Submit } from "@/components/form";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <FadeIn>
      <div className="eyebrow mb-4">Account help</div>
      <h1 className="headline text-5xl">Forgot password</h1>
      <p className="mt-3 text-sm text-ivory/55">Enter the email you signed up with. We will send you a 6-digit code to choose a new password.</p>
      <ActionForm action={requestPasswordResetAction} className="mt-10 space-y-5" toast={false}>
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
        </Field>
        <Submit className="btn-primary w-full py-3" pendingText="Sending code">
          Send me a code
        </Submit>
      </ActionForm>
      <p className="mt-8 text-sm text-ivory/55">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-semibold text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </FadeIn>
  );
}
