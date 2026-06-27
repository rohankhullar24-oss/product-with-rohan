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
    title: "Product Manager",
    company: "Airtel Payments Bank",
    dates: "Jul 2022 – Present",
    bullets: [
      "Led product strategy, roadmap prioritization and execution for a high-scale B2B platform serving 600K+ users and ₹7 Cr monthly GMV, driving growth, platform scalability, automation and user experience improvements.",
      "Delivered platform modernization initiatives across multiple digital touchpoints, introducing automation and self-service capabilities that improved onboarding conversion from 50% to 73%, increased lead conversion from 17% to 40%, and enhanced operational efficiency through workflow automation.",
      "Re-engineered onboarding workflows and user journeys, increasing completion rates from 5% to 50%, reducing turnaround time from 33 minutes to 15 minutes, and significantly improving process efficiency through journey optimization.",
      "Built and deployed AI-powered document verification and image intelligence capabilities, reducing onboarding turnaround from 3 days to 15 minutes, lowering manual effort by ~60%, and scaling verification coverage through automated workflows.",
      "Improved user engagement and platform adoption through targeted lifecycle interventions, reducing inactive users by ~15% and enabling proactive identification and reactivation of high-value user segments.",
      "Implemented platform controls, risk-management capabilities and automation frameworks that strengthened platform reliability, improved onboarding quality and reduced operational overhead at scale.",
    ],
    awards: [
      "Highflyer Award — Recognized for driving high-impact platform transformation initiatives",
      "Certificate of Appreciation — launched the lead-generation flow driving higher conversion",
    ],
  },
  {
    title: "Assistant Product Manager",
    company: "Airtel Payments Bank",
    dates: "Part of tenure",
    bullets: [
      "Built and launched an end-to-end inventory and ordering platform supporting catalog management, order tracking, fulfillment workflows and third-party integrations, improving operational efficiency and user experience.",
      "Improved self-onboarding conversion from 50% to 85% through authentication enhancements, journey optimization and error reduction initiatives.",
      "Built a lead-management platform processing 25K+ leads per month and leveraged user research and market insights to support product launches and roadmap prioritization.",
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
