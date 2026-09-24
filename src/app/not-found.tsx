import Link from "next/link";
import { BosaLogo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <BosaLogo size={72} />
      <div className="mt-8 font-display text-[120px] leading-none text-ivory/10">404</div>
      <h1 className="headline -mt-6 text-4xl">Off the pitch.</h1>
      <p className="mt-3 text-ivory/55">The page you were looking for has been substituted.</p>
      <Link href="/" className="btn-gold mt-8">Back to BOSA League</Link>
    </div>
  );
}
