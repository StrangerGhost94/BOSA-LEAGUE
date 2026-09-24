import Link from "next/link";
import { syncPayment } from "@/lib/payments";
import { BosaLogo } from "@/components/ui";

export const metadata = { title: "Payment status" };

export default async function CallbackPage({ searchParams }: { searchParams: { OrderTrackingId?: string } }) {
  let status: string = "UNKNOWN";
  if (searchParams.OrderTrackingId) {
    try {
      const p = await syncPayment(searchParams.OrderTrackingId);
      status = p?.status ?? "UNKNOWN";
    } catch (e) {
      console.error(e);
      status = "ERROR";
    }
  }
  const copy: Record<string, [string, string]> = {
    COMPLETED: ["Payment confirmed", "Your BOSA League membership is now active. Welcome to the institution."],
    PENDING: ["Payment processing", "Pesapal is still confirming your payment. This page and your account update automatically once it clears; it usually takes under a minute."],
    FAILED: ["Payment not completed", "The payment was declined or cancelled. You have not been charged. You can try again at any time."],
    ERROR: ["We could not verify the payment", "Please refresh in a moment. If money left your account, contact the League office with your Mobile Money reference."],
    UNKNOWN: ["No payment found", "We could not find a payment for this link."],
  };
  const [title, body] = copy[status] ?? copy.UNKNOWN;
  return (
    <section className="container-x flex min-h-[80vh] items-center justify-center pt-24">
      <div className="glass max-w-lg rounded-3xl p-10 text-center">
        <BosaLogo size={64} className="mx-auto" />
        <h1 className="headline mt-6 text-4xl">{title}</h1>
        <p className="mt-4 text-ivory/60">{body}</p>
        <div className="mt-8 flex justify-center gap-3">
          {status === "COMPLETED" ? <Link href="/fixtures" className="btn-gold">Enter the match centre</Link> : <Link href="/membership" className="btn-primary">Back to membership</Link>}
          {status === "PENDING" && <Link href={`/membership/callback?OrderTrackingId=${searchParams.OrderTrackingId}`} className="btn-ghost">Check again</Link>}
        </div>
      </div>
    </section>
  );
}
