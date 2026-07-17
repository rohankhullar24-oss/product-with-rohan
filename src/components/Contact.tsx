"use client";

import { useScrollAnimation } from "@/lib/use-scroll-animation";

const contacts = [
  {
    label: "Email",
    value: "rohankhullar24@gmail.com",
    href: "mailto:rohankhullar24@gmail.com",
  },
  {
    label: "Phone",
    value: "+91-8982305748",
    href: "tel:+918982305748",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/rohankhullar",
    href: "https://www.linkedin.com/in/rohankhullar/",
  },
  {
    label: "Location",
    value: "Gurugram, India",
    href: undefined,
  },
];

export default function Contact() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id="contact"
      className="bg-navy dark:bg-slate-900"
      ref={ref}
    >
      <div
        className={`mx-auto max-w-5xl px-6 py-20 text-center transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
          Contact
        </h2>
        <h3 className="mt-2 text-3xl font-bold text-white">Let&apos;s talk</h3>
        <p className="mx-auto mt-4 max-w-xl text-slate-300 dark:text-slate-400">
          Open to product roles and conversations. Feel free to reach out directly.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          {contacts.map((contact, i) =>
            contact.href ? (
              <a
                key={contact.label}
                href={contact.href}
                target={contact.href.startsWith("http") ? "_blank" : undefined}
                rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={`text-sm text-slate-300 transition-all duration-500 hover:text-accent ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDelay: isVisible ? `${i * 100}ms` : "0ms",
                }}
              >
                <span className="block text-xs uppercase tracking-widest text-slate-500">
                  {contact.label}
                </span>
                {contact.value}
              </a>
            ) : (
              <div
                key={contact.label}
                className={`text-sm text-slate-300 transition-all duration-500 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDelay: isVisible ? `${i * 100}ms` : "0ms",
                }}
              >
                <span className="block text-xs uppercase tracking-widest text-slate-500">
                  {contact.label}
                </span>
                {contact.value}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
