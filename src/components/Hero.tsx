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
          Product Manager · Growth, Platform & Payments · AI & Automation
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
          I lead platform, growth and automation products at scale — delivering
          measurable business impact through improved conversion, operational
          efficiency and AI-led automation. I manage a B2B platform serving{" "}
          <span className="font-semibold text-navy dark:text-white">
            600K+ users
          </span>{" "}
          at{" "}
          <span className="font-semibold text-navy dark:text-white">
            ₹7 Cr monthly GMV
          </span>
          , driving{" "}
          <span className="font-semibold text-navy dark:text-white">
            73% onboarding conversion
          </span>
          ,{" "}
          <span className="font-semibold text-navy dark:text-white">
            40% lead conversion
          </span>
          , and{" "}
          <span className="font-semibold text-navy dark:text-white">
            15-minute B2B onboarding
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
