"use client";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-navy dark:text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-slate dark:text-slate-400">
        {children}
      </div>
    </div>
  );
}

type CheckRow = {
  check: string;
  field: string;
  required: string;
  rule: string;
  rejects: string;
};

const CHECKS: CheckRow[] = [
  { check: "Liveness (outside)", field: "liveness.image1", required: "Yes", rule: "Must be a live, real-time capture", rejects: "“Please click the outside shop photo again in real time.”" },
  { check: "Liveness (inside)", field: "liveness.image2", required: "Yes", rule: "Must be a live, real-time capture", rejects: "“Please click the inside shop photo again in real time.”" },
  { check: "Is a shop", field: "isShop", required: "Yes", rule: "Image must depict a shop", rejects: "“The uploaded photo does not appear to be of a shop.”" },
  { check: "Shop front visible", field: "shopFrontPresent", required: "Yes", rule: "Front must be clearly shown", rejects: "“Shop front is not clearly visible.”" },
  { check: "Shop inside visible", field: "shopInsidePresent", required: "Yes", rule: "Inside must be clearly shown", rejects: "“Shop inside area is not clearly visible.”" },
  { check: "Inside image valid", field: "shopInsideValid", required: "Yes", rule: "Passes Hyperverge's internal validity check", rejects: "“Inside shop photo is not valid.”" },
  { check: "Shop open", field: "shopOpen", required: "Yes", rule: "Shop must be operational at capture time", rejects: "“Shop appears to be closed.”" },
  { check: "Shop type", field: "shopType", required: "Yes", rule: "Must be a permanent structure", rejects: "“This shop setup is not eligible for onboarding.”" },
  { check: "Inside/outside match", field: "interImageNobMatch", required: "Yes", rule: "Both photos must belong to the same shop", rejects: "“Inside and outside shop photos do not appear to belong to the same shop.”" },
  { check: "Inventory present", field: "inventory.inventoryPresent", required: "Yes", rule: "Stock must be visible to validate an active business", rejects: "“Shop inventory is not clearly visible.”" },
  { check: "Business category", field: "categories[*].mcc", required: "Yes", rule: "Detected category must match an Aadhaar Pay–allowed MCC", rejects: "“This business category is currently not eligible for onboarding.”" },
  { check: "Shopkeeper face visible", field: "shopkeeper.*.shopkeeperPresent", required: "Yes", rule: "Applicant's face visible in at least one photo", rejects: "“Shopkeeper/applicant face is not clearly visible.”" },
  { check: "Face match", field: "findFace.faceFound / matchScore", required: "Yes", rule: "Detected face must match ID photo above a confidence threshold", rejects: "“Face verification could not be completed or face match score is low.”" },
  { check: "Matched face crop", field: "findFace.matchingFaceCrop", required: "Yes", rule: "A usable face crop must be generated", rejects: "“Matched face crop is not available.”" },
  { check: "Age check", field: "idAgeRange.low/high", required: "Used for CAF", rule: "Confirms applicant is an eligible adult; ambiguous cases route for review", rejects: "“The applicant may be below eligible age.”" },
  { check: "Name match", field: "nameMatch.match", required: "No", rule: "Captured shop name should match the entered name", rejects: "“Shop name could not be matched with the entered shop name.”" },
  { check: "Name match score", field: "nameMatch.matchScore", required: "No", rule: "Must clear a configurable confidence threshold", rejects: "“Shop name match is low.”" },
  { check: "Face review flag", field: "findFace.toBeReviewed", required: "No", rule: "Face check should not be auto-flagged for manual review", rejects: "“Face validation requires review.”" },
  { check: "Matched image", field: "findFace.foundIn", required: "No", rule: "Identifies whether the face was found in the front or inside photo", rejects: "“Face could not be mapped to shop front or inside photo.”" },
  { check: "Banner present", field: "banner.bannerPresent", required: "No", rule: "Supporting signal, not a hard gate", rejects: "“Shop board/banner is not clearly visible.”" },
  { check: "Banner type", field: "banner.bannerType", required: "No", rule: "Permanent signage preferred", rejects: "“Temporary banner/signage detected.”" },
  { check: "Contact number", field: "shopContactNumbers.valid", required: "No", rule: "Supporting field if captured", rejects: "“Shop contact number could not be validated.”" },
  { check: "GST", field: "shopGstNumber.valid", required: "No", rule: "Optional, not required for small shops", rejects: "“GST details could not be validated.”" },
];

function CheckTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-3 font-semibold text-navy dark:text-white">Check</th>
            <th className="px-4 py-3 font-semibold text-navy dark:text-white">Field</th>
            <th className="px-4 py-3 font-semibold text-navy dark:text-white">Required</th>
            <th className="px-4 py-3 font-semibold text-navy dark:text-white">Rule</th>
            <th className="px-4 py-3 font-semibold text-navy dark:text-white">Rejects with</th>
          </tr>
        </thead>
        <tbody>
          {CHECKS.map((row, i) => (
            <tr
              key={row.field}
              className={
                i % 2 === 0
                  ? "bg-white dark:bg-slate-950"
                  : "bg-slate-50/50 dark:bg-slate-900/50"
              }
            >
              <td className="px-4 py-3 align-top font-medium text-navy dark:text-white">{row.check}</td>
              <td className="px-4 py-3 align-top font-mono text-xs text-slate-500 dark:text-slate-500">{row.field}</td>
              <td className="px-4 py-3 align-top text-slate dark:text-slate-400">{row.required}</td>
              <td className="px-4 py-3 align-top text-slate dark:text-slate-400">{row.rule}</td>
              <td className="px-4 py-3 align-top text-slate dark:text-slate-400">{row.rejects}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AiDocVerification() {
  return (
    <section className="border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-700">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Product Case Study
        </h1>
        <h2 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          AI-Powered Document Verification for Merchant Onboarding
        </h2>
        <p className="mt-4 text-slate dark:text-slate-400">
          I led the design and rollout of an AI-driven document-verification
          workflow for partner KYC. It cut manual verification effort by 60%
          and tightened fraud and RBI compliance controls.
        </p>

        <Section title="Problem Statement">
          <p>
            Shop-photo verification during retailer onboarding was only
            manually reviewed 33% of the time. The rest auto-approved. That
            auto-approve path was gameable: a retailer could keep retrying
            until a submission slipped through, undermining the KYC and
            fraud controls the photo step existed for.
          </p>
        </Section>

        <Section title="The Verification Model">
          <p>
            We moved shop-photo review from a mostly manual spot-check to an
            automated decision engine built on Hyperverge. It scores every
            submission against a fixed rule set before a human ever sees it.
          </p>
          <CheckTable />
        </Section>

        <Section title="Rollout">
          <p>
            The rollout was phased by circle, not switched on nationally. It
            went live in 3 circles in September, then expanded pan-India by
            December. That gave room to tune thresholds, especially the
            name-match score, against real rejection patterns before scaling
            further.
          </p>
        </Section>

        <Section title="Outcome">
          <p>
            Manual verification effort dropped 60%, and the
            retry-until-approved loophole in the old spot-check process
            closed for good. Rejected photos still route to a human
            reviewer. The model isn&apos;t a black-box gate, it&apos;s a
            triage layer that clears the obvious cases and escalates the
            rest. Fraud controls and RBI KYC compliance both got stronger as
            a result.
          </p>
        </Section>
      </div>
    </section>
  );
}
