import Link from "next/link";
import { Metadata } from "next";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import HandbookDownloadButton from "@/components/HandbookDownloadButton";

export const metadata: Metadata = {
  title: "Thank you | The Product Manager Handbook",
  robots: { index: false },
};

export default async function HandbookSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; payment_id?: string; signature?: string }>;
}) {
  const { order_id: orderId, payment_id: paymentId, signature } = await searchParams;

  let verified = false;
  if (orderId && paymentId && signature) {
    try {
      verified = verifyRazorpaySignature(orderId, paymentId, signature);
    } catch (error) {
      console.error("Razorpay signature verification failed:", error);
    }
  }

  const downloadParams =
    verified && orderId && paymentId && signature
      ? `order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}&signature=${encodeURIComponent(signature)}`
      : "";

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
              <HandbookDownloadButton
                href={`/api/handbook/download?type=pdf-compressed&${downloadParams}`}
                filename="The-Product-Manager-Handbook-compressed.pdf"
                label="Download PDF (1.5MB, faster)"
                className="rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-70 dark:bg-slate-700 dark:hover:bg-accent"
              />
              <HandbookDownloadButton
                href={`/api/handbook/download?type=docx&${downloadParams}`}
                filename="The-Product-Manager-Handbook.docx"
                label="Download Word (.docx)"
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-navy transition-colors hover:border-accent hover:text-accent disabled:opacity-70 dark:border-slate-600 dark:text-white dark:hover:border-accent dark:hover:text-accent"
              />
              <HandbookDownloadButton
                href={`/api/handbook/download?type=pdf&${downloadParams}`}
                filename="The-Product-Manager-Handbook.pdf"
                label="Download PDF (4.6MB, original)"
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-navy transition-colors hover:border-accent hover:text-accent disabled:opacity-70 dark:border-slate-600 dark:text-white dark:hover:border-accent dark:hover:text-accent"
              />
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              The compressed PDF looks and reads identically — same text, same layout — but has
              slightly reduced accessibility tagging for screen readers. Choose the original if
              that matters to you.
            </p>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Button not working? This can happen inside an app&apos;s built-in browser (e.g.
              LinkedIn, Instagram, WhatsApp). Tap the &bull;&bull;&bull; or share icon and choose
              &quot;Open in Chrome/Safari&quot;, then try the buttons again. Still stuck? Email me
              at{" "}
              <a href="mailto:rohankhullar24@gmail.com" className="text-accent hover:underline">
                rohankhullar24@gmail.com
              </a>{" "}
              with your payment ID and I&apos;ll send the book directly.
            </p>
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
