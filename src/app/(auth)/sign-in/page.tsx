import Link from "next/link";
import { ActionForm, Field, Submit } from "@/components/form";
import { signInAction } from "@/app/actions/auth";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <FadeIn>
      <div className="eyebrow mb-4">Welcome back</div>
      <h1 className="headline text-5xl">Sign in</h1>
      <p className="mt-3 text-sm text-ivory/55">Access your membership, club panel or the BOSA control room.</p>
      <ActionForm action={signInAction} className="mt-10 space-y-5" toast={false}>
        <input type="hidden" name="next" value={searchParams.next ?? ""} />
        <Field label="Email">
          <input name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" autoComplete="current-password" required className="input" placeholder="Your password" />
        </Field>
        <Submit className="btn-primary w-full py-3" pendingText="Signing in">
          Sign in
        </Submit>
      </ActionForm>
      <p className="mt-8 text-sm text-ivory/55">
        New to BOSA League?{" "}
        <Link href="/sign-up" className="font-semibold text-gold hover:underline">
          Create an account
        </Link>
      </p>
    </FadeIn>
  );
}
