"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const OWNER_EMAIL = "rohankhullar24@gmail.com";
const BUCKET = "personal-files";
const SLOT_PREFIX = "slot";

export default function FilesPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthorized(data.user?.email === OWNER_EMAIL);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthorized(session?.user?.email === OWNER_EMAIL);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function refreshCurrentFile() {
    supabase.storage
      .from(BUCKET)
      .list(SLOT_PREFIX)
      .then(({ data }) => {
        setCurrentFileName(data && data.length > 0 ? data[0].name : null);
      });
  }

  useEffect(() => {
    if (!authorized) return;
    refreshCurrentFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Uploading...");

    const { data: existing } = await supabase.storage.from(BUCKET).list(SLOT_PREFIX);
    if (existing && existing.length > 0) {
      await supabase.storage
        .from(BUCKET)
        .remove(existing.map((f) => `${SLOT_PREFIX}/${f.name}`));
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`${SLOT_PREFIX}/${file.name}`, file);

    if (error) {
      setStatus(`Upload failed: ${error.message}`);
    } else {
      setStatus(`Uploaded ${file.name}.`);
      refreshCurrentFile();
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownload() {
    if (!currentFileName) return;
    setStatus("Downloading...");

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(`${SLOT_PREFIX}/${currentFileName}`);

    if (error || !data) {
      setStatus(`Download failed: ${error?.message ?? "unknown error"}`);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFileName;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(null);
  }

  if (authorized === null) {
    return null;
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950">
        <div className="mx-auto w-full max-w-lg px-6 py-16 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            This page isn&apos;t available.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-lg px-6 py-10 md:pt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            My Files
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Upload a file here, then download it from any other device.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-6">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Current file:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {currentFileName ?? "none"}
            </span>
          </p>

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              id="file-upload-input"
            />
            <label
              htmlFor="file-upload-input"
              className="cursor-pointer rounded-full bg-accent px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Upload
            </label>

            <button
              onClick={handleDownload}
              disabled={!currentFileName}
              className="rounded-full border border-slate-300 dark:border-slate-600 px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download
            </button>
          </div>

          {status && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{status}</p>
          )}
        </div>
      </div>
    </main>
  );
}
