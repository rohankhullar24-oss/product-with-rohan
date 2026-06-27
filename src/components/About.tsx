"use client";

import { useScrollAnimation } from "@/lib/use-scroll-animation";
import { AnimatedCounter } from "./AnimatedCounter";

const highlights = [
  "4+ years leading platform, growth and automation products at scale",
  "Manage a B2B platform serving 600K+ users — ₹7 Cr monthly GMV",
  "Delivered 73% onboarding conversion, 40% lead conversion, 15-min B2B onboarding TAT",
  "Built AI-powered automation workflows reducing manual effort by 60%",
];

const stats = [
  { label: "Years of Experience", value: 4, suffix: "+" },
  { label: "Active Users", value: 600000, suffix: "+", prefix: "" },
  { label: "Onboarding Conversion", value: 73, suffix: "%", prefix: "" },
  { label: "Lead Conversion", value: 40, suffix: "%", prefix: "" },
];

const education = [
  {
    degree: "MBA, International Business",
    school: "Delhi School of Economics, University of Delhi",
    detail: "2022 · 81.43%",
  },
];

const certifications = [
  "Google AI Professional Certificate (Google)",
  "Certified Registered Product Owner (Scrum Inc.)",
  "Advanced Excel (CFI)",
];

export default function About() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="about"
      className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 dark:border-slate-700"
      ref={ref}
    >
      <div
        className={`mx-auto max-w-5xl px-6 py-20 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          About
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-navy dark:text-white">
          Driving product strategy, growth and AI-led automation at scale
        </h3>

        <p className="mt-6 max-w-3xl text-slate dark:text-slate-400 leading-relaxed">
          I lead platform, growth and automation products delivering measurable business impact through improved conversion, operational efficiency and AI-led automation. I combine market research, funnel analytics, and AI-powered workflows to solve high-leverage problems at scale. Based in Gurugram, India.
        </p>

        {/* Animated Stats */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 transition-all duration-500 hover:shadow-lg hover:border-accent dark:hover:border-accent transform hover:scale-105 cursor-pointer ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 100}ms` : "0ms",
              }}
            >
              <p className="text-sm font-semibold uppercase tracking-widest text-slate dark:text-slate-400 group-hover:text-accent transition-colors">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold text-accent">
                {stat.prefix}
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
            </div>
          ))}
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {highlights.map((item, i) => (
            <li
              key={item}
              className={`flex gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate dark:text-slate-300 transition-all duration-500 hover:bg-accent-light dark:hover:bg-accent/10 hover:border-accent dark:hover:border-accent transform hover:translate-x-1 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDelay: isVisible ? `${(i + 4) * 100}ms` : "0ms",
              }}
            >
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-navy dark:text-white">
              Education
            </h4>
            <ul className="mt-4 space-y-4">
              {education.map((edu) => (
                <li
                  key={edu.degree}
                  className="group p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-navy dark:text-white group-hover:text-accent transition-colors">
                    {edu.degree}
                  </p>
                  <p className="text-sm text-slate dark:text-slate-400">
                    {edu.school}
                  </p>
                  <p className="text-sm text-slate dark:text-slate-400">
                    {edu.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest text-navy dark:text-white">
              Certifications
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-slate dark:text-slate-400">
              {certifications.map((cert) => (
                <li
                  key={cert}
                  className="flex gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                >
                  <span className="text-accent text-lg">✓</span>
                  <span className="group-hover:text-navy dark:group-hover:text-white transition-colors">
                    {cert}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
