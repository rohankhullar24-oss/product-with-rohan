import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Rohan Khullar",
  description: "Terms governing use of Product with Rohan, the PM Handbook, and the AI Resume Builder.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          Effective July 8, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate dark:text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Acceptance</h2>
            <p className="mt-2">
              By using productwithrohan.online (&quot;this site&quot;), operated by Rohan Khullar,
              an individual based in Gurugram, India, you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">What this site offers</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>A personal portfolio, blog, and articles.</li>
              <li>
                <b className="text-navy dark:text-white">Product Shots</b> — a login-gated PM
                interview-prep tool (daily questions, news, articles).
              </li>
              <li>
                <b className="text-navy dark:text-white">The Product Manager Handbook</b> — a
                pay-what-you-want digital book, delivered by download after payment via Razorpay.
              </li>
              <li>
                <b className="text-navy dark:text-white">AI Resume Builder</b> — you upload a
                resume and target role; an AI model (Google Gemini) generates a tailored version
                for you to download.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              AI-generated content — no warranty on accuracy
            </h2>
            <p className="mt-2">
              The Handbook and the resumes produced by the AI Resume Builder are AI-assisted or
              AI-generated. They&apos;re provided &quot;as is,&quot; without any warranty of
              accuracy, completeness, or fitness for a particular purpose — including no guarantee
              that a tailored resume will result in interviews or job offers. You&apos;re
              responsible for reviewing and verifying anything generated before relying on it,
              submitting it to an employer, or otherwise acting on it. Nothing on this site is
              professional career, legal, or financial advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Payments</h2>
            <p className="mt-2">
              Handbook payments are processed by Razorpay. Pricing is pay-what-you-want, set by
              you at checkout. Refunds are governed by the{" "}
              <Link href="/refund-policy" className="text-accent hover:underline">
                Refund &amp; Cancellation Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Intellectual property
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                The Handbook, site content, and code are owned by Rohan Khullar unless otherwise
                noted. Purchasing the Handbook gives you a personal-use license to read and keep
                it — you may not resell, redistribute, or republish it commercially.
              </li>
              <li>
                You retain ownership of the resume and personal information you upload to the AI
                Resume Builder. By uploading it, you consent to it being sent to Google&apos;s
                Gemini API solely to generate your tailored resume (see the{" "}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                ). The tailored resume produced for you is yours to use.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Acceptable use</h2>
            <p className="mt-2">
              Don&apos;t use this site for anything unlawful, attempt to bypass payment or
              security measures, or scrape/republish content without permission. I may suspend or
              terminate access to Product Shots for abuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Limitation of liability
            </h2>
            <p className="mt-2">
              To the fullest extent permitted by law, I am not liable for any indirect,
              incidental, or consequential damages arising from your use of this site or its
              content. Total liability for any claim is limited to the amount you paid, if any.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Governing law
            </h2>
            <p className="mt-2">
              These terms are governed by the laws of India. Any disputes are subject to the
              exclusive jurisdiction of the courts of Gurugram, Haryana.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Changes</h2>
            <p className="mt-2">
              I may update these terms from time to time. The effective date above reflects the
              latest revision. Continued use of the site after changes means you accept them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Contact</h2>
            <p className="mt-2">
              Questions about these terms:{" "}
              <a href="mailto:rohankhullar24@gmail.com" className="text-accent hover:underline">
                rohankhullar24@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
