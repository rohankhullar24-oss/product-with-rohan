"use client";

import { useState } from "react";

type Status = "idle" | "downloading" | "done" | "error";

export default function HandbookDownloadButton({
  href,
  filename,
  label,
  className,
}: {
  href: string;
  filename: string;
  label: string;
  className: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);

  async function handleClick() {
    setStatus("downloading");
    setProgress(0);

    try {
      const response = await fetch(href);
      if (!response.ok || !response.body) {
        setStatus("error");
        return;
      }

      const total = Number(response.headers.get("Content-Length")) || 0;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) setProgress(Math.round((received / total) * 100));
      }

      const blob = new Blob(chunks as BlobPart[]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "downloading") {
    return (
      <button type="button" disabled className={className}>
        Downloading… {progress > 0 ? `${progress}%` : ""}
      </button>
    );
  }

  if (status === "done") {
    return (
      <button type="button" onClick={handleClick} className={className}>
        ✓ Downloaded — click to save again
      </button>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {status === "error" ? "Download failed — tap to retry" : label}
    </button>
  );
}
