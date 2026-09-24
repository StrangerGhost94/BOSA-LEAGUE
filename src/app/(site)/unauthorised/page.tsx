import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function Unauthorised() {
  return (
    <section className="container-x pt-40">
      <EmptyState title="This area is reserved" body="Your account does not have access to this panel. If you think this is a mistake, contact the BOSA League office." action={<Link href="/" className="btn-gold">Return home</Link>} />
    </section>
  );
}
