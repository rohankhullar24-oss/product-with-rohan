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
      className="border-b border-slate-200 dark:border-slate-700 relative overflow-hidden"
      style={{
        background: "linear-gradient(to right, #2a2a2a 0%, #2a2a2a 45%, #f5f1ed 45%, #f5f1ed 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 flex items-center relative z-10">
        <div className="w-full lg:w-1/2 lg:ml-auto">
          <p
            className={`text-sm font-semibold uppercase tracking-widest text-accent transition-all duration-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            0 → 1 · Roadmapping · Growth · AI
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
      </div>
    </section>
  );
}
