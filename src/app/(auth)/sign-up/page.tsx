import Link from "next/link";
import { FadeIn } from "@/components/motion";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getTeams, getMembershipPrice } from "@/lib/data";
import { ugx } from "@/lib/format";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  const [teams, price] = await Promise.all([getTeams(), getMembershipPrice()]);
  return (
    <FadeIn>
      <div className="eyebrow mb-4">Join the league</div>
      <h1 className="headline text-5xl">Create your account</h1>
      <p className="mt-3 text-sm text-ivory/55">
        After signing up you will activate your membership with a one-time payment of <span className="text-gold">{ugx(price)}</span>.
      </p>
      <SignUpForm teams={teams.filter((t) => t.active).map((t) => ({ id: t.id, name: t.name, intakeYear: t.intakeYear }))} />
      <p className="mt-8 text-sm text-ivory/55">
        Already a member?{" "}
        <Link href="/sign-in" className="font-semibold text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </FadeIn>
  );
}
