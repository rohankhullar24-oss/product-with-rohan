"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const ROLE_OPTIONS = [
  "Associate Product Manager",
  "Product Manager",
  "Senior Product Manager",
  "Group Product Manager",
  "Director of Product",
  "VP of Product",
];

export default function ResumeBuilderPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState(ROLE_OPTIONS[1]);
  const [targetIndustry, setTargetIndustry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload your resume (PDF or DOCX).");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("targetRole", targetRole);
    if (targetCompany) formData.append("targetCompany", targetCompany);
    if (targetIndustry) formData.append("targetIndustry", targetIndustry);
    formData.append("resume", file);

    try {
      const res = await fetch("/api/resume-builder", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(data.error || "Something went wrong.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "_") || "resume"}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your tailored resume is ready!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Resume Builder
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Upload your current resume and get a version tailored to the role you&apos;re
          targeting.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-accent"
            />
            <input
              required
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-accent"
            />
          </div>

          <input
            required
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-accent"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current resume (PDF or DOCX)
            </label>
            <input
              required
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Targeting role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-accent"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <input
              placeholder="Target industry (optional, e.g. e-commerce)"
              value={targetIndustry}
              onChange={(e) => setTargetIndustry(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-accent"
            />
          </div>

          <input
            placeholder="Company applying to (optional)"
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-accent"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Tailoring your resume..." : "Generate tailored resume"}
          </button>
        </form>
      </div>
    </main>
  );
}
