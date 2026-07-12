"use client";

import { useState } from "react";

const links = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#contact", label: "Contact" },
  { href: "/blogs", label: "Blogs" },
  { href: "/productshot", label: "Product Shots" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:bg-slate-950/90 dark:border-slate-700">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="#top" className="text-lg font-semibold text-navy dark:text-white">
          Product with <span className="text-accent">Rohan</span>
        </a>

        <button
          className="lg:hidden text-navy dark:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <ul className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate dark:text-slate-300">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-accent">
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/Rohan_Khullar_Resume.pdf"
              download
              className="rounded-full bg-navy px-4 py-2 text-white transition-colors hover:bg-accent dark:bg-slate-700 dark:hover:bg-accent"
            >
              Download CV
            </a>
          </li>
        </ul>
      </nav>

      {open && (
        <ul className="lg:hidden flex flex-col gap-1 border-t border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="block py-2 transition-colors hover:text-accent"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="pt-2">
            <a
              href="/Rohan_Khullar_Resume.pdf"
              download
              className="inline-block rounded-full bg-navy px-4 py-2 text-white transition-colors hover:bg-accent dark:bg-slate-700 dark:hover:bg-accent"
            >
              Download CV
            </a>
          </li>
        </ul>
      )}
    </header>
  );
}
