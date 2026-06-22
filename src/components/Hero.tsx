"use client";

import { useEffect, useState } from "react";

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="top"
      className="border-b border-slate-200 bg-slate-50 dark:bg-slate-950 dark:border-slate-700"
    >
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
        <p
          className={`text-sm font-semibold uppercase tracking-widest text-accent transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Product Manager · B2B Fintech
        </p>
        <h1
          className={`mt-4 max-w-2xl text-4xl font-bold tracking-tight text-navy dark:text-white sm:text-5xl transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            transitionDelay: mounted ? "100ms" : "0ms",
          }}
        >
          Hi, I&apos;m Rohan Khullar.
        </h1>
        <p
          className={`mt-4 max-w-2xl text-lg text-slate dark:text-slate-400 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            transitionDelay: mounted ? "200ms" : "0ms",
          }}
        >
          I drive product strategy and roadmap for B2B fintech platforms — turning
          one-off journeys into reusable, scalable products. I own a merchant
          onboarding &amp; lifecycle platform serving{" "}
          <span className="font-semibold text-navy dark:text-white">
            600K+ partners
          </span>{" "}
          at{" "}
          <span className="font-semibold text-navy dark:text-white">
            ₹7 Cr monthly GMV
          </span>
          , and have lifted partner conversion from{" "}
          <span className="font-semibold text-navy dark:text-white">
            50% to 73%
          </span>{" "}
          while cutting onboarding turnaround from{" "}
          <span className="font-semibold text-navy dark:text-white">
            3 days to 15 minutes
          </span>
          .
        </p>

        <div
          className={`mt-8 flex flex-wrap gap-4 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            transitionDelay: mounted ? "300ms" : "0ms",
          }}
        >
          <a
            href="/Rohan_Khullar_Resume.pdf"
            download
            className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent dark:bg-slate-700 dark:hover:bg-accent"
          >
            Download CV
          </a>
          <a
            href="#contact"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-navy dark:text-white dark:border-slate-600 transition-colors hover:border-accent hover:text-accent dark:hover:border-accent"
          >
            Get in Touch
          </a>
        </div>
      </div>
    </section>
  );
}
