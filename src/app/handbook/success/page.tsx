import Link from "next/link";
import { Metadata } from "next";
import {
  getStripe,
  HANDBOOK_PRODUCT_METADATA_KEY,
  HANDBOOK_PRODUCT_METADATA_VALUE,
} from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Thank you | The Product Manager Handbook",
  robots: { index: false },
};

async function verifySession(sessionId: string | undefined) {
  if (!sessionId) return false;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return (
      session.payment_status === "paid" &&
      session.metadata?.[HANDBOOK_PRODUCT_METADATA_KEY] === HANDBOOK_PRODUCT_METADATA_VALUE
    );
  } catch (error) {
    console.error("Stripe session verification failed:", error);
    return false;
  }
}

export default async function HandbookSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const verified = await verifySession(sessionId);

  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        {verified ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Payment confirmed
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy dark:text-white">
              Thank you — here&apos;s your book
            </h1>
            <p className="mt-3 text-slate dark:text-slate-400">
              Your download links are ready below. Keep this page open until both downloads
              finish.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={`/api/handbook/download?type=pdf&session_id=${encodeURIComponent(sessionId!)}`}
                download
                className="rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent dark:bg-slate-700 dark:hover:bg-accent"
              >
                Download PDF
              </a>
              <a
                href={`/api/handbook/download?type=docx&session_id=${encodeURIComponent(sessionId!)}`}
                download
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-navy transition-colors hover:border-accent hover:text-accent dark:border-slate-600 dark:text-white dark:hover:border-accent dark:hover:text-accent"
              >
                Download Word (.docx)
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Payment not verified
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-navy dark:text-white">
              We couldn&apos;t confirm this payment
            </h1>
            <p className="mt-3 text-slate dark:text-slate-400">
              If you completed checkout and still see this, contact me directly and I&apos;ll send
              the book over — otherwise, head back and try again.
            </p>
          </>
        )}

        <Link href="/handbook" className="mt-8 inline-block text-sm text-accent hover:underline">
          ← Back to the handbook page
        </Link>
      </div>
    </main>
  );
}
