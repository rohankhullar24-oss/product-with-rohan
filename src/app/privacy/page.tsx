import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Rohan Khullar",
  description: "How Product with Rohan collects, uses, and protects your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 bg-white dark:bg-slate-950 px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Back to home
        </Link>

        <h1 className="mt-6 text-3xl font-semibold text-navy dark:text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          Effective July 8, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate dark:text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Who this covers</h2>
            <p className="mt-2">
              This policy covers productwithrohan.online, operated by Rohan Khullar, an
              individual based in Gurugram, India (&quot;I&quot;, &quot;me&quot;, &quot;this
              site&quot;). If you have questions, contact me at{" "}
              <a href="mailto:rohankhullar24@gmail.com" className="text-accent hover:underline">
                rohankhullar24@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">What I collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <b className="text-navy dark:text-white">Product Shots login:</b> your email
                address, used only to send a sign-in code and maintain your session.
              </li>
              <li>
                <b className="text-navy dark:text-white">AI Resume Builder:</b> the name, phone
                number, email address, and resume file you submit, plus your target role/company/
                industry — used only to generate your tailored resume.
              </li>
              <li>
                <b className="text-navy dark:text-white">Handbook payments:</b> Razorpay processes
                your payment directly. I never see or store your card, UPI, or bank details — I
                only receive confirmation that a payment succeeded.
              </li>
              <li>
                <b className="text-navy dark:text-white">Site usage:</b> anonymous page-view
                analytics via Vercel Analytics, which does not use cookies and does not identify
                you individually.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Third parties I share data with
            </h2>
            <p className="mt-2">
              I use a small number of service providers to run this site. Each only receives what
              it needs to do its job:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <b className="text-navy dark:text-white">Supabase</b> — stores Product Shots
                account/session data.
              </li>
              <li>
                <b className="text-navy dark:text-white">Razorpay</b> — processes handbook
                payments. Subject to Razorpay&apos;s own privacy policy.
              </li>
              <li>
                <b className="text-navy dark:text-white">Google (Gemini API)</b> — if you use the
                AI Resume Builder, your name, contact details, and full resume text are sent to
                Google&apos;s Gemini API solely to generate your tailored resume. Subject to
                Google&apos;s API data-use terms.
              </li>
              <li>
                <b className="text-navy dark:text-white">Vercel</b> — hosts this site and provides
                cookieless analytics.
              </li>
              <li>
                <b className="text-navy dark:text-white">Resend</b> — delivers login-code emails
                for Product Shots.
              </li>
            </ul>
            <p className="mt-2">I do not sell your data, and I do not use it for advertising.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              How long I keep it
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Resumes uploaded to the AI Resume Builder are processed in memory and are never
                written to a database — they&apos;re discarded as soon as your tailored PDF is
                generated.
              </li>
              <li>
                Product Shots account data is kept until you ask me to delete it (email me and
                I&apos;ll remove it).
              </li>
              <li>Payment records are retained by Razorpay per their own policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Cookies</h2>
            <p className="mt-2">
              Product Shots uses a strictly necessary session cookie (via Supabase) to keep you
              signed in — nothing else. There are no advertising or marketing cookies on this
              site, and Vercel Analytics does not use cookies at all.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Your rights</h2>
            <p className="mt-2">
              You can ask me to access, correct, or delete your data at any time by emailing{" "}
              <a href="mailto:rohankhullar24@gmail.com" className="text-accent hover:underline">
                rohankhullar24@gmail.com
              </a>
              . For payment data, you&apos;ll need to reach out to Razorpay directly, since I
              never hold it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Age</h2>
            <p className="mt-2">This site is intended for users 18 and older.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">
              Changes to this policy
            </h2>
            <p className="mt-2">
              I may update this policy from time to time. The effective date above will reflect
              the latest revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-white">Related pages</h2>
            <p className="mt-2">
              <Link href="/terms" className="text-accent hover:underline">
                Terms of Service
              </Link>{" "}
              ·{" "}
              <Link href="/refund-policy" className="text-accent hover:underline">
                Refund &amp; Cancellation Policy
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
