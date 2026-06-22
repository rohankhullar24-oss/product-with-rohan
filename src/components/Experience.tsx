"use client";

import { useScrollAnimation } from "@/lib/use-scroll-animation";

type Role = {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
  awards?: string[];
};

const roles: Role[] = [
  {
    title: "Product Manager — B2B",
    company: "Airtel Payments Bank",
    dates: "Jan 2024 – Present",
    bullets: [
      "Own product strategy and roadmap for the B2B merchant & retailer lifecycle platform (600K+ partners, ₹7 Cr monthly GMV), aligning engineering, business, operations, and design across merchants, distributors, banking partners, and enterprise clients.",
      "Led funnel optimization and journey redesign that lifted partner onboarding conversion from 50% to 73%, using drop-off analysis to prioritize the highest-friction steps.",
      "Cut onboarding turnaround from 3 days to 15 minutes by digitizing workflows and building seamless, automated verification journeys.",
      "Reduced merchant inactivity 15% by launching targeted in-app interventions — contextual pop-ups, re-engagement nudges, and lifecycle prompts — triggered by dormancy and drop-off signals.",
      "Built reusable, configurable acquisition infrastructure and AI-powered document-verification workflows — accelerating new partner-journey launches while cutting manual verification effort 60% and strengthening fraud / compliance controls.",
      "Ran A/B testing, UAT, and controlled rollouts informed by product analytics, cutting onboarding-related issues 20% and lifting partner satisfaction.",
    ],
    awards: [
      "Highflyer Award — led the RBI audit for the B2B platform",
      "Certificate of Appreciation — launched the lead-generation flow driving higher conversion",
    ],
  },
  {
    title: "Assistant Product Manager",
    company: "Airtel Payments Bank",
    dates: "Jul 2022 – Dec 2023",
    bullets: [
      "Conducted market and user research to identify product opportunities and shape onboarding and new financial-service launches.",
      "Built a lead-generation & assignment tool routing 25K leads/month into onboarding, and expanded the retailer services catalog (micro-ATM, biometric auth) by onboarding third-party providers — analyzing activation trends to inform roadmap prioritization.",
    ],
  },
  {
    title: "Performance Marketing Executive",
    company: "Upscalio",
    dates: "Aug 2021 – Feb 2022",
    bullets: [
      "Ran paid-media campaigns for D2C brands (Green-Soul, Auto-Furnish) across marketplaces; built media plans and ROAS models, and benchmarked competitors to lift engagement.",
    ],
  },
];

export default function Experience() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="experience"
      className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
      ref={ref}
    >
      <div
        className={`mx-auto max-w-5xl px-6 py-20 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Experience
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          Where I&apos;ve made an impact
        </h3>

        <div className="mt-10 space-y-10">
          {roles.map((role, i) => (
            <div
              key={`${role.company}-${role.title}`}
              className={`group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 sm:p-8 transition-all duration-500 hover:shadow-lg hover:border-accent dark:hover:border-accent hover:-translate-y-1 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 150}ms` : "0ms",
              }}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h4 className="text-xl font-bold text-navy dark:text-white">
                    {role.title}
                  </h4>
                  <p className="text-sm font-medium text-accent">{role.company}</p>
                </div>
                <p className="text-sm font-medium text-slate dark:text-slate-400">
                  {role.dates}
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {role.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex gap-3 text-sm text-slate dark:text-slate-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    {bullet}
                  </li>
                ))}
              </ul>

              {role.awards && (
                <div className="mt-4 rounded-lg bg-accent-light dark:bg-accent/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-navy dark:text-accent">
                    Awards
                  </p>
                  <ul className="mt-2 space-y-1">
                    {role.awards.map((award) => (
                      <li
                        key={award}
                        className="text-sm text-slate dark:text-slate-300"
                      >
                        {award}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
