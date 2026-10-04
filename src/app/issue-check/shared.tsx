"use client";

/** Pieces shared by the check page and the history page. */

export type Finding = {
  part: string;
  issueId: number;
  issue: string;
  action: string;
  severity: "" | "Micro" | "Minor" | "Major";
  structural: boolean;
  inList: boolean;
  confidence: number;
  reason: string;
  box: [number, number, number, number] | null;
  frame: number;
  time: string;
  options: [number, string][];
};

const CODE_KEY = "issue-check-code";

export function readCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}
export function writeCode(v: string) {
  try {
    localStorage.setItem(CODE_KEY, v);
  } catch {}
}

export const SEV: Record<string, string> = {
  Micro: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Minor: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  Major: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function Boxed({
  src,
  findings,
  index,
}: {
  src: string;
  findings: Pick<Finding, "box">[];
  index: number[];
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Inspected part" className="block h-auto w-full" />
      {findings.map((f, i) =>
        f.box ? (
          <div
            key={i}
            className="absolute rounded-md border-[2.5px] border-[#FF4D57] shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
            style={{
              top: `${f.box[0] / 10}%`,
              left: `${f.box[1] / 10}%`,
              height: `${(f.box[2] - f.box[0]) / 10}%`,
              width: `${(f.box[3] - f.box[1]) / 10}%`,
            }}
          >
            <span className="absolute -left-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-[#FF4D57] text-xs font-bold text-white">
              {index[i] + 1}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

