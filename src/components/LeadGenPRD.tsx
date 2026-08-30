"use client";

import Image from "next/image";

function Wireframes({
  images,
}: {
  images: { src: string; alt: string; width: number; height: number }[];
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {images.map((img) => (
        <div
          key={img.src}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700"
        >
          <Image
            src={img.src}
            alt={img.alt}
            width={img.width}
            height={img.height}
            className="h-auto w-full"
          />
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-xl font-bold text-navy dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-slate dark:text-slate-400">
        {children}
      </div>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <li className="ml-5 list-disc marker:text-accent">{children}</li>;
}

export default function LeadGenPRD() {
  return (
    <section className="border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-700">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Product Case Study &middot; PRD
        </h1>
        <h2 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          Lead Generation & Assignment for Retailer Onboarding
        </h2>
        <p className="mt-4 text-slate dark:text-slate-400">
          A PRD I owned end-to-end across six milestones over roughly 18
          months, from a broken lead-capture form to a full self-serve,
          paid-lead funnel. Restructured here for a portfolio audience, with
          company- and system-specific details generalized.
        </p>

        <Section title="Problem Statement">
          <p>
            The retailer sign-up website was generating leads, but a large
            share were fake, low-intent, or missing basic information needed
            to act on them. Conversion from lead to onboarded retailer sat
            around 17%, and field sales teams were spending time chasing
            leads that never should have entered the funnel.
          </p>
        </Section>

        <Section title="Objective">
          <ul>
            <Field>Filter incoming leads by capturing more qualifying fields at the point of submission.</Field>
            <Field>Increase visibility and discoverability of the retailer sign-up page itself.</Field>
          </ul>
        </Section>

        <Section title="Success Metrics">
          <ul>
            <Field>Primary: raise lead-to-onboarding conversion from 17% to 40%.</Field>
            <Field>Secondary: ensure leads captured are exclusively from users with genuine intent to become a retailer.</Field>
          </ul>
        </Section>

        <Section title="Actors & Channels">
          <ul>
            <Field><span className="font-semibold text-navy dark:text-white">Actors:</span> prospective new retailers.</Field>
            <Field><span className="font-semibold text-navy dark:text-white">Channels:</span> public website, field-agent mobile app, self-serve in-app flow (added in Milestone 2).</Field>
          </ul>
        </Section>

        <Section eyebrow="Milestone 0" title="Lead Capture Form & Website Revamp">
          <p>Redesigned the form to gate on identity verification before collecting business details, and added fields needed to qualify a lead before it reaches sales:</p>
          <ul>
            <Field>Full name</Field>
            <Field>Mobile number, OTP-verified — entry to the rest of the form is blocked until OTP verification completes</Field>
            <Field>Duplicate handling: if the number already belongs to an onboarded partner, the user sees a message directing them to support instead of re-submitting; if a lead for that number was already raised recently, the user is told a representative will follow up rather than being allowed to duplicate the lead</Field>
            <Field>Shop name and address (two lines), pincode with city/state auto-populated and locked, district/tehsil/block, landmark</Field>
            <Field>Current nature of business (dropdown, reused from the existing onboarding taxonomy)</Field>
            <Field>Whether the applicant already has a biometric device</Field>
          </ul>
          <p>
            Every submission gets a unique lead ID; a disclosure discloses
            onboarding is chargeable; a success message sets expectations
            (contact within 3 working days); every field&apos;s
            mandatory/optional status is configurable rather than hardcoded;
            and captured leads pipe to the field-agent app in real time.
          </p>
          <p>
            On the website itself: &quot;Login&quot;, &quot;Register&quot;,
            and &quot;Become a Retailer&quot; all route directly to the lead
            form, which became the first thing a prospective retailer sees
            on the page rather than being buried below outdated earnings
            claims and imagery. Added a clear 4-step explainer (fill the
            form → sales rep contacts you → sales rep onboards you → start
            earning) and surfaced support contact for anyone who needed help
            before converting.
          </p>
          <p>
            A daily/monthly reporting cadence was built alongside this to
            give the sales team visibility: a rolling 30-day feed, a
            monthly cumulative view broken into open/closed/other, and an
            aging column (days pending) so sales could triage by priority
            rather than by request order.
          </p>
        </Section>

        <Section eyebrow="Milestone 1" title="Lead Visibility & Assignment for Field Agents">
          <p>
            The hardest part of the spec: getting the right lead in front of
            the right field agent without a central dispatcher.
          </p>
          <ul>
            <Field>Address strings from the web form get converted to lat/long via reverse geocoding, with a configurable fallback chain (full address → pincode only) if the first geocoding pass fails.</Field>
            <Field>A lead dashboard in the agent app with both map and list views, independently combinable search (name/number), lead-type filter, sort, and distance filter — defaulting to new leads within 10km, closest-first, last 30 days.</Field>
            <Field>Five lead states an agent can move between: New, Accepted, In Progress, Rejected, Converted — each with its own map/list card detail and its own configurable set of fields shown.</Field>
            <Field>Aging rules: a lead older than a configurable threshold auto-marks as "Not Picked" and notifies the lead by SMS; an agent who accepts a lead but doesn't act on it within a window loses visibility into that specific lead going forward (a configurable penalty, not a permanent one).</Field>
            <Field>Contact details stay hidden until acceptance — in the New view, an agent sees name, distance, and address but not the phone number; accepting reveals the full card with a tap-to-call.</Field>
            <Field>Configurable search radius by role (a promoter/distributor-level agent might search 25km, a zonal manager 100km).</Field>
            <Field>A generalized "remark" system: any outcome (not interested, converted via another number, follow-up needed) maps to a target lead state, and that mapping — plus the description text captured with it — is configurable rather than hardcoded per remark.</Field>
          </ul>
          <Wireframes
            images={[
              {
                src: "/projects/lead-gen-prd/milestone1-dashboard.png",
                alt: "Lead dashboard wireframes: map view, list view, and distance filter",
                width: 918,
                height: 613,
              },
              {
                src: "/projects/lead-gen-prd/milestone1-lead-detail.png",
                alt: "Accepted lead detail screen with call/direction actions and remarks flow",
                width: 886,
                height: 562,
              },
              {
                src: "/projects/lead-gen-prd/milestone1-statuses.png",
                alt: "Rejected and Converted lead status views",
                width: 568,
                height: 562,
              },
            ]}
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Wireframes from the ranger training deck built alongside this
            milestone. Names shown are demo/placeholder data.
          </p>
        </Section>

        <Section eyebrow="Milestone 2" title="Self-Serve Lead Creation In-App">
          <p>
            Extended lead capture beyond the website into a self-serve flow
            inside the retailer-facing app, letting a prospective retailer
            build their own lead without waiting for outbound sales
            contact:
          </p>
          <ul>
            <Field>Mobile number entry and OTP verification, with dedupe checks against existing partner records before proceeding — an already-registered or already-blacklisted number is stopped at this step with a clear message.</Field>
            <Field>Aadhaar-based identity verification (face auth or biometric), with the same dedupe and blacklist checks re-run, followed by a summary screen showing the verified identity details back to the user for confirmation.</Field>
            <Field>Additional profile details (income, PAN, business nature) with a name-matching threshold between Aadhaar and PAN; mismatches surface specific, actionable error copy rather than a generic failure.</Field>
            <Field>Shop location capture using the device's current location by default (avoiding a second geocoding round-trip), with an edit option that falls back to the geocoding API if the user corrects it manually.</Field>
            <Field>A four-stage progress tracker (registration → sales visit → application submitted → onboarding complete) so the lead always knows where they stand, including failure states with next steps (resubmit, contact support) rather than dead ends.</Field>
            <Field>Leads originating from this in-app flow surface to field agents as "hot leads," visually distinguished from and prioritized over standard web leads.</Field>
          </ul>
          <a
            href="https://www.youtube.com/watch?v=CSGc7xvyJ88"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-semibold text-accent hover:underline"
          >
            Watch a walkthrough of this flow →
          </a>
        </Section>

        <Section eyebrow="Milestone 3" title="Charging & Refunds">
          <p>
            The most significant strategic shift in the PRD: moving from
            free lead capture to charging an upfront, refundable fee, to
            filter out low-intent leads and pull onboarding revenue earlier
            in the funnel.
          </p>
          <ul>
            <Field>Three-tier config, set per region: no charge, charge mandatory, or charge optional (pay-now vs. pay-later, each routed with a different service SLA).</Field>
            <Field>Consent language and a benefits page precede payment; paid leads are tagged distinctly through the whole pipeline (paid vs. hot vs. standard) and always shown to agents in that region only.</Field>
            <Field>Automatic refund after a configurable window if onboarding doesn't complete, plus a manual refund path for support-escalated cases — including a bulk CSV upload workflow with per-record status tracking, since escalations arrived in batches.</Field>
            <Field>A reporting layer purpose-built for this: unique leads started, unique converted, unique paid, in absolute numbers and conversion rate, sliceable by region.</Field>
          </ul>
        </Section>

        <Section eyebrow="Milestones 4–5" title="Follow-Up Scheduling & Refund Hardening">
          <p>
            Later milestones tightened operational edges surfaced once the
            funnel was live at scale:
          </p>
          <ul>
            <Field>A one-time, capped extension window so an agent actively following up on a lead isn't forced to lose it to the standard aging rule — deliberately limited to once per lead to prevent gaming.</Field>
            <Field>An escalation matrix for aging unconverted leads (notify manager at day 5, escalate up the chain at weeks 3–4) so stalled leads don't just sit silently.</Field>
            <Field>Hardened refund logic: refunds only fire against leads with a real, unclaimed payment sitting in escrow, with explicit rejection reasons (no payment found, already refunded, already transferred) surfaced back to the ops team rather than failing silently.</Field>
          </ul>
        </Section>

        <Section title="Outcome">
          <p>
            This PRD became the basis for the rebuilt lead-generation and
            assignment tool, which now routes roughly 25,000 leads a month
            into the onboarding funnel. See the{" "}
            <a
              href="/#projects"
              className="font-semibold text-accent hover:underline"
            >
              Lead-Generation & Assignment Tool
            </a>{" "}
            card for the results.
          </p>
        </Section>
      </div>
    </section>
  );
}
