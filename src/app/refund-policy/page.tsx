import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Rohan Khullar",
  description: "Refund and cancellation policy for The Product Manager Handbook.",
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          Effective July 8, 2026 — applies to purchases of The Product Manager Handbook
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate dark:text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Digital product — all sales are final
            </h2>
            <p className="mt-2">
              The Product Manager Handbook is a digital product delivered instantly upon
              successful payment. Because it&apos;s delivered immediately and can&apos;t be
              &quot;returned,&quot; all purchases are final and non-refundable once the file has
              been successfully delivered — including for change of mind, dissatisfaction with the
              content, or not having read this policy before purchasing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Pay-what-you-want pricing
            </h2>
            <p className="mt-2">
              You choose your own price at checkout. Because you set the amount yourself, refund
              requests based on price (&quot;I paid too much&quot;) aren&apos;t applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              The one exception: genuine payment or delivery failures
            </h2>
            <p className="mt-2">
              If your payment was successfully charged but you did not receive a working download
              due to a technical error on my end, or you were charged more than once for the same
              order, contact me within 7 days at{" "}
              <a href="mailto:rohankhullar24@gmail.com" className="text-accent hover:underline">
                rohankhullar24@gmail.com
              </a>{" "}
              with your payment ID. I&apos;ll review it and either re-send the file or issue a
              refund via Razorpay, at my discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              How refunds are processed
            </h2>
            <p className="mt-2">
              Where a refund is approved under the exception above, it&apos;s issued to your
              original Razorpay payment method and typically takes 5–7 business days to reflect,
              depending on your bank or payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Related pages</h2>
            <p className="mt-2">
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>{" "}
              ·{" "}
              <Link href="/terms" className="text-accent hover:underline">
                Terms of Service
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
