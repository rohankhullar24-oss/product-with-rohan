# CarBecho: full code (single file)

## `src/app/carbecho/page.tsx`

```tsx
import type { Metadata } from "next";
import CarBechoFlow from "./CarBechoFlow";

export const metadata: Metadata = {
  title: "CarBecho — Interactive Inspection Flow",
  description:
    "A field inspector's 200-point used-car inspection with a Co-Pilot chat on every checklist row: type it, say it, photograph it, and mark the row from the answer.",
  // Unlisted: reachable by direct link only, not in the sitemap or nav.
  robots: { index: false, follow: false },
};

export default function CarBechoPage() {
  return <CarBechoFlow />;
}
```

## `src/app/carbecho/CarBechoFlow.tsx`

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import InspectionChat, { type ChatContext, type MarkRequest } from "./InspectionChat";
import {
  AI_HINT_COUNT,
  C,
  JOBS,
  SECTIONS,
  type ChecklistItem,
  type Job,
} from "@/lib/inspector/flow";

/**
 * The real field app offers two answers, not three: the checklist rows are
 * phrased as questions and the inspector says Yes or No. There is no N/A.
 */
type Mark = {
  v: "pass" | "fail";
  byAi?: boolean;
  byChat?: boolean;
  sev?: string;
  note?: string;
};

type Screen = "verify" | "inspect" | "report";

const fmt = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const key = (sectionIndex: number, itemIndex: number) => `${sectionIndex}-${itemIndex}`;

/* --------------------------------------------------------------- atoms */

const Pill = ({
  bg,
  color,
  children,
  style,
}: {
  bg: string;
  color: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <span
    style={{
      background: bg,
      color,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      justifyContent: "center",
      fontFamily: "'Segoe UI', -apple-system, Roboto, sans-serif",
    }}
  >
    <div style={{ width: "100%", maxWidth: 430, background: C.bg, minHeight: "100vh", position: "relative" }}>
      {children}
    </div>
  </div>
);

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, marginBottom: 12, ...style }}>
    {children}
  </div>
);

const SecTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.sub, marginBottom: 10 }}>
    {children}
  </div>
);

const Ring = ({ pct, color }: { pct: number; color: string }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={52} height={52}>
      <circle cx={26} cy={26} r={radius} fill="none" stroke={C.line} strokeWidth={5} />
      <circle
        cx={26}
        cy={26}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct / 100)}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset .4s" }}
      />
      <text x={26} y={30} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>
        {pct}%
      </text>
    </svg>
  );
};

/* ------------------------------------------------------------ the flow */

function InspectionFlow({ job, onBack }: { job: Job; onBack: () => void }) {
  const [screen, setScreen] = useState<Screen>("verify");
  const [state, setState] = useState<Record<string, Mark>>({});
  const [openSec, setOpenSec] = useState<string | null>("body");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<ChatContext>(null);
  const copilot = job.copilot;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const setItem = useCallback(
    (sectionIndex: number, itemIndex: number, value: Mark["v"], extra: Partial<Mark> = {}) =>
      setState((previous) => ({
        ...previous,
        [key(sectionIndex, itemIndex)]: { ...(previous[key(sectionIndex, itemIndex)] || {}), v: value, ...extra },
      })),
    []
  );

  const totals = useMemo(() => {
    let done = 0;
    let fail = 0;
    let total = 0;
    let aiDone = 0;
    let chatDone = 0;
    SECTIONS.forEach((section, sectionIndex) =>
      section.items.forEach((_, itemIndex) => {
        total += 1;
        const mark = state[key(sectionIndex, itemIndex)];
        if (mark?.v) {
          done += 1;
          if (mark.v === "fail") fail += 1;
          if (mark.byAi) aiDone += 1;
          if (mark.byChat) chatDone += 1;
        }
      })
    );
    return { done, fail, total, aiDone, chatDone, pct: Math.round((done / total) * 100) };
  }, [state]);

  const acceptAI = (sectionIndex: number, itemIndex: number, item: ChecklistItem) => {
    if (!item.ai) return;
    setItem(sectionIndex, itemIndex, item.ai.v, { byAi: true, sev: item.ai.sev, note: item.ai.src });
  };

  const acceptAllAI = () => {
    setState((previous) => {
      const next = { ...previous };
      SECTIONS.forEach((section, sectionIndex) =>
        section.items.forEach((item, itemIndex) => {
          if (item.ai && !next[key(sectionIndex, itemIndex)]?.v) {
            next[key(sectionIndex, itemIndex)] = {
              v: item.ai.v,
              byAi: true,
              sev: item.ai.sev,
              note: item.ai.src,
            };
          }
        })
      );
      return next;
    });
  };

  /** A mark handed back by the chat sheet lands in the same store as a tap. */
  const onChatMark = useCallback(
    ({ ref, verdict, severity, note }: MarkRequest) => {
      setItem(ref.sectionIndex, ref.itemIndex, verdict, {
        byChat: true,
        byAi: false,
        sev: verdict === "fail" ? severity || "Minor" : undefined,
        note,
      });
      setOpenSec(SECTIONS[ref.sectionIndex].id);
    },
    [setItem]
  );

  const askAbout = (sectionIndex: number, itemIndex: number) => {
    const section = SECTIONS[sectionIndex];
    const item = section.items[itemIndex];
    setChatContext({
      sectionName: section.name,
      item: item.n,
      ref: { sectionIndex, itemIndex, label: item.n, section: section.name },
    });
    setChatOpen(true);
  };

  const accent = copilot ? C.ai : C.purple;
  const accentDark = copilot ? "#5B2DD0" : C.purpleDark;

  const Header = ({ title }: { title: string }) => (
    <div style={{ background: accent, color: "#fff", padding: "14px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={onBack}
        style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 10, width: 32, height: 32, fontSize: 16, cursor: "pointer" }}
      >
        ←
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>
          {copilot ? "✦ Copilot Mode" : "Manual Mode"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>{title}</div>
      </div>
      {screen === "inspect" && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 600 }}>TAT</div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 16, fontWeight: 800, color: seconds > 3600 ? "#FFB4C0" : "#B8FFDF" }}>
            {fmt(seconds)}
          </div>
        </div>
      )}
    </div>
  );

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    background: accent,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "14px 0",
    fontSize: 14.5,
    fontWeight: 800,
    cursor: "pointer",
  };
  const pText: React.CSSProperties = { fontSize: 12.5, color: C.sub, lineHeight: 1.55, margin: "0 0 10px" };

  /* ------------------------------------------------------ verify screen */

  if (screen === "verify") {
    return (
      <Shell>
        <Header title="Verify & pair" />
        <div style={{ padding: 16 }}>
          {copilot && (
            <div style={{ background: C.aiBg, border: "1px solid #C4B0FF", borderRadius: 14, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: C.purpleDark, lineHeight: 1.55 }}>
              <b>✦ Pre-fetched before you arrived:</b> VAHAN RC + challan cleared, {job.seller}&apos;s 8 self-photos
              analysed — 2 probable defects flagged. OBD pairing ready.
            </div>
          )}
          <Card>
            <SecTitle>1 · Ownership check</SecTitle>
            {!verified ? (
              <>
                <p style={pText}>
                  {copilot
                    ? "Scan RC — OCR extracts VIN & owner and matches VAHAN in real time. No manual typing."
                    : "Manually verify the Registration Certificate. Check VIN, owner name, and insurance against physical documents."}
                </p>
                <button
                  onClick={() => {
                    setScanning(true);
                    setTimeout(() => {
                      setScanning(false);
                      setVerified(true);
                    }, 1200);
                  }}
                  style={btnPrimary}
                >
                  {scanning ? "Scanning RC…" : copilot ? "📷 Scan RC" : "✍️ Manual RC check"}
                </button>
              </>
            ) : (
              <div style={{ background: C.passBg, borderRadius: 12, padding: 12, fontSize: 12.5, color: "#0A6E4C", lineHeight: 1.6 }}>
                ✓ VIN matches VAHAN record
                <br />✓ Owner: {job.seller} (1st owner)
                <br />✓ ID proof face-match passed
                <br />⚠ Hypothecation active — auto-added to Documents section
              </div>
            )}
          </Card>
          <Card>
            <SecTitle>2 · OBD dongle</SecTitle>
            {copilot ? (
              <>
                <p style={pText}>
                  Plug the OBD-II reader — engine codes, battery health, ABS/SRS status, and true odometer
                  stream straight into the checklist.
                </p>
                <Pill bg={C.passBg} color={C.pass}>● Paired · CB-OBD-114</Pill>
              </>
            ) : (
              <>
                <p style={pText}>
                  No OBD device. Engine codes, odometer accuracy, and electrical systems will be checked
                  manually during the inspection and road test.
                </p>
                <Pill bg={C.naBg} color={C.na}>○ Not used — manual checks apply</Pill>
              </>
            )}
          </Card>
          <Card>
            <SecTitle>3 · Co-Pilot chat</SecTitle>
            <p style={pText}>
              Available on every checklist row from here on. Type it, say it, photograph it — or all three at
              once. The answer comes back in the chat, in Hinglish or English, spoken aloud if you want it.
            </p>
            <Pill bg={C.aiBg} color={C.ai}>💬 Ready · text · voice · photo</Pill>
          </Card>
          <button
            disabled={!verified}
            onClick={() => {
              setScreen("inspect");
              setRunning(true);
            }}
            style={{ ...btnPrimary, opacity: verified ? 1 : 0.4, marginTop: 4 }}
          >
            Begin 200-point inspection →
          </button>
        </div>
      </Shell>
    );
  }

  /* ----------------------------------------------------- inspect screen */

  if (screen === "inspect") {
    const baseline = 60 * 60;
    const target = copilot ? 25 * 60 : 60 * 60;
    const progress = Math.min((seconds / baseline) * 100, 100);
    const targetPct = (target / baseline) * 100;

    return (
      <Shell>
        <Header title={job.car} />
        <div style={{ background: C.ink, padding: "10px 16px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#A9A3B8", fontWeight: 600, marginBottom: 6 }}>
            <span>ELAPSED {fmt(seconds)}</span>
            {copilot && <span style={{ color: "#9E7BFF" }}>AI TARGET 25:00</span>}
            <span>BASELINE 60:00</span>
          </div>
          <div style={{ position: "relative", height: 8, background: "#2C2440", borderRadius: 6 }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress}%`,
                background: copilot ? "linear-gradient(90deg,#3DDC97,#7C4DFF)" : "linear-gradient(90deg,#5B2EDD,#9B72FF)",
                borderRadius: 6,
                transition: "width 1s linear",
              }}
            />
            {copilot && <div style={{ position: "absolute", left: `${targetPct}%`, top: -3, bottom: -3, width: 2, background: "#9E7BFF" }} />}
          </div>
        </div>

        <div style={{ padding: "12px 16px 96px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 12, marginBottom: 12 }}>
            <Ring pct={totals.pct} color={accent} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>
                {totals.done}/{totals.total} checks · {totals.fail} defects
              </div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>
                {copilot
                  ? `${totals.aiDone} auto-filled by Copilot · ${totals.chatDone} from chat`
                  : `Manual mode — ${totals.chatDone} marked from chat`}
              </div>
            </div>
            <Pill bg={copilot ? C.aiBg : C.naBg} color={copilot ? C.ai : C.na}>
              {copilot ? "✦ Copilot ON" : "Manual"}
            </Pill>
          </div>

          {copilot && totals.aiDone < AI_HINT_COUNT && (
            <button
              onClick={acceptAllAI}
              style={{ width: "100%", background: C.ai, color: "#fff", border: "none", borderRadius: 14, padding: "12px 0", fontSize: 13, fontWeight: 800, cursor: "pointer", marginBottom: 12 }}
            >
              ✦ Accept all {AI_HINT_COUNT} Copilot pre-fills (saves ~14 min)
            </button>
          )}

          {SECTIONS.map((section, sectionIndex) => {
            const doneIn = section.items.filter((_, itemIndex) => state[key(sectionIndex, itemIndex)]?.v).length;
            const open = openSec === section.id;
            return (
              <div
                key={section.id}
                style={{ background: C.card, border: `1px solid ${open ? accent : C.line}`, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}
              >
                <button
                  onClick={() => setOpenSec(open ? null : section.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: 18 }}>{section.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: C.ink }}>{section.name}</span>
                    <span style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
                      {section.pts} points · {doneIn}/{section.items.length} groups done
                    </span>
                  </span>
                  <span style={{ color: doneIn === section.items.length ? C.pass : C.sub, fontWeight: 800, fontSize: 13 }}>
                    {doneIn === section.items.length ? "✓" : open ? "▾" : "▸"}
                  </span>
                </button>

                {open && (
                  <div style={{ borderTop: `1px solid ${C.line}` }}>
                    {section.items.map((item, itemIndex) => {
                      const mark = state[key(sectionIndex, itemIndex)] || ({} as Mark);
                      return (
                        <div
                          key={item.n}
                          style={{ padding: "11px 14px", borderBottom: itemIndex < section.items.length - 1 ? `1px solid ${C.line}` : "none" }}
                        >
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.ink }}>{item.n}</div>
                            <button
                              onClick={() => askAbout(sectionIndex, itemIndex)}
                              aria-label={`Ask the Co-Pilot about ${item.n}`}
                              style={{ background: C.aiBg, border: "none", color: C.ai, borderRadius: 8, padding: "4px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
                            >
                              💬 Ask
                            </button>
                          </div>

                          {copilot && item.ai && !mark.v && (
                            <div style={{ background: C.aiBg, borderRadius: 10, padding: "8px 10px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, fontSize: 11.5, color: C.purpleDark, lineHeight: 1.4 }}>
                                ✦ Suggests <b>{item.ai.v === "pass" ? "YES" : "NO"}</b> — {item.ai.src}
                              </div>
                              <button
                                onClick={() => acceptAI(sectionIndex, itemIndex, item)}
                                style={{ background: C.ai, color: "#fff", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                              >
                                Accept
                              </button>
                            </div>
                          )}

                          {!copilot && item.ai && !mark.v && (
                            <div style={{ background: C.naBg, borderRadius: 10, padding: "7px 10px", marginBottom: 8, fontSize: 11, color: C.na, fontWeight: 600 }}>
                              Manual check required — inspect physically, or ask the Co-Pilot
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 6 }}>
                            {(["pass", "fail"] as const).map((verdict) => (
                              <button
                                key={verdict}
                                onClick={() => setItem(sectionIndex, itemIndex, verdict, { byAi: false, byChat: false })}
                                style={{
                                  flex: 1,
                                  padding: "9px 0",
                                  borderRadius: 10,
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: `1.5px solid ${mark.v === verdict ? "transparent" : C.line}`,
                                  background: mark.v === verdict ? (verdict === "pass" ? C.pass : C.fail) : "#fff",
                                  color: mark.v === verdict ? "#fff" : C.sub,
                                }}
                              >
                                {verdict === "pass" ? "✓ Yes" : "✕ No"}
                              </button>
                            ))}
                          </div>

                          {mark.v === "fail" && (
                            <>
                              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                                {(["Minor", "Major", "Critical"] as const).map((sev) => {
                                  const active = (mark.sev || "Minor") === sev;
                                  return (
                                    <button
                                      key={sev}
                                      onClick={() => setItem(sectionIndex, itemIndex, "fail", { sev })}
                                      style={{
                                        flex: 1,
                                        padding: "6px 0",
                                        borderRadius: 8,
                                        fontSize: 11.5,
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        border: `1.5px solid ${active ? "transparent" : C.line}`,
                                        background: active ? (sev === "Minor" ? C.amber : C.fail) : "#fff",
                                        color: active ? "#fff" : C.sub,
                                      }}
                                    >
                                      {sev}
                                    </button>
                                  );
                                })}
                              </div>
                              <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <Pill bg={C.failBg} color={C.fail}>📷 Photo required</Pill>
                                {mark.byAi && <Pill bg={C.aiBg} color={C.ai}>✦ AI-detected</Pill>}
                                {mark.byChat && <Pill bg={C.aiBg} color={C.ai}>💬 via chat</Pill>}
                              </div>
                            </>
                          )}

                          {mark.v && mark.v !== "fail" && (mark.byAi || mark.byChat) && (
                            <div style={{ marginTop: 6, fontSize: 10.5, color: C.ai, fontWeight: 700, lineHeight: 1.4 }}>
                              {mark.byChat ? "💬" : "✦"} {mark.note}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* chat launcher */}
        <div style={{ position: "sticky", bottom: 0, padding: 12, background: "linear-gradient(transparent, #F5F3FA 40%)", display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setChatContext(null);
              setChatOpen(true);
            }}
            style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 14, padding: "14px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
          >
            💬
          </button>
          <button
            disabled={totals.done < totals.total}
            onClick={() => {
              setRunning(false);
              setScreen("report");
            }}
            style={{ ...btnPrimary, opacity: totals.done < totals.total ? 0.45 : 1 }}
          >
            {totals.done < totals.total ? `Complete ${totals.total - totals.done} remaining checks` : "Generate report →"}
          </button>
        </div>

        <InspectionChat
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          context={chatContext}
          onClearContext={() => setChatContext(null)}
          onMark={onChatMark}
          accent={accent}
        />
      </Shell>
    );
  }

  /* ------------------------------------------------------ report screen */

  const majors = Object.values(state).filter((mark) => mark.v === "fail" && mark.sev === "Major").length;
  const criticals = Object.values(state).filter((mark) => mark.v === "fail" && mark.sev === "Critical").length;
  const minors = totals.fail - majors - criticals;
  const score = Math.max(0, 100 - criticals * 14 - majors * 9 - minors * 3);

  return (
    <Shell>
      <Header title="Inspection report" />
      <div style={{ padding: 16 }}>
        <div style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})`, borderRadius: 20, padding: 20, color: "#fff", marginBottom: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, letterSpacing: 1 }}>CARBECHO HEALTH SCORE</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1 }}>
            {score}
            <span style={{ fontSize: 18, opacity: 0.7 }}>/100</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Pill bg="rgba(255,255,255,.18)" color="#fff">{totals.total - totals.fail} passed</Pill>
            <Pill bg="rgba(255,255,255,.18)" color="#FFC5D1">
              {criticals ? `${criticals} critical · ` : ""}
              {majors} major · {minors} minor
            </Pill>
            <Pill bg="rgba(255,255,255,.18)" color="#B8FFDF">TAT {fmt(seconds)} vs 60:00 baseline</Pill>
            {copilot && <Pill bg="rgba(255,255,255,.18)" color="#E8DCFF">✦ {totals.aiDone} AI pre-fills</Pill>}
            {totals.chatDone > 0 && <Pill bg="rgba(255,255,255,.18)" color="#E8DCFF">💬 {totals.chatDone} from chat</Pill>}
          </div>
        </div>

        <Card>
          <SecTitle>Defect summary → price engine</SecTitle>
          {totals.fail === 0 && (
            <div style={{ fontSize: 12.5, color: C.sub, padding: "6px 0" }}>No defects recorded.</div>
          )}
          {Object.entries(state)
            .filter(([, mark]) => mark.v === "fail")
            .map(([entryKey, mark]) => {
              const [sectionIndex, itemIndex] = entryKey.split("-").map(Number);
              return (
                <div key={entryKey} style={{ padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: C.ink, fontWeight: 600 }}>{SECTIONS[sectionIndex].items[itemIndex].n}</span>
                    <Pill
                      bg={mark.sev === "Critical" || mark.sev === "Major" ? C.failBg : C.amberBg}
                      color={mark.sev === "Critical" || mark.sev === "Major" ? C.fail : C.amber}
                    >
                      {mark.sev || "Minor"}
                    </Pill>
                  </div>
                  {mark.byChat && mark.note && (
                    <div style={{ fontSize: 10.5, color: C.ai, fontWeight: 600, marginTop: 3, lineHeight: 1.4 }}>
                      💬 {mark.note}
                    </div>
                  )}
                </div>
              );
            })}
          <div style={{ marginTop: 12, background: copilot ? C.aiBg : C.naBg, borderRadius: 12, padding: 12, fontSize: 12.5, color: copilot ? C.purpleDark : C.sub, lineHeight: 1.55 }}>
            {copilot ? (
              <>
                ✦ Fed to the <b>CarBecho Price Engine</b>: refurb estimate and adjusted offer are computed by
                the pricing rules engine, not by the assistant, and sent to the seller&apos;s phone.
              </>
            ) : (
              <>Report sent to the pricing desk for review. Offer expected within 24h. Agent has noted defects for the QC team.</>
            )}
          </div>
        </Card>

        <Card>
          <SecTitle>Chat trail</SecTitle>
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
            Every Co-Pilot exchange in this inspection — question, photo thumbnail, section, item, severity and
            action — is written to the shared findings log, so QC can read back exactly what the inspector asked
            and what the assistant answered.{" "}
            <Link href="/inspector/history" style={{ color: C.ai, fontWeight: 700 }}>
              Open the findings log →
            </Link>
          </div>
        </Card>

        <button
          onClick={onBack}
          style={{ width: "100%", background: "#fff", color: accent, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "13px 0", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}
        >
          ← Back to jobs
        </button>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------ job list */

export default function CarBechoFlow() {
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  if (activeJob) {
    return <InspectionFlow job={activeJob} onBack={() => setActiveJob(null)} />;
  }

  return (
    <Shell>
      <div style={{ background: C.purple, color: "#fff", padding: "14px 16px" }}>
        <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase" }}>
          CarBecho Evaluator
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Today&apos;s inspections</div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            ["2", "Assigned"],
            ["0", "In progress"],
            ["38m", "Avg TAT ↓"],
          ].map(([value, label]) => (
            <div key={label} style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.purpleDark }}>{value}</div>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.sub, letterSpacing: 0.8 }}>TAP A JOB TO START</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        {JOBS.map((job) => (
          <div
            key={job.id}
            onClick={() => setActiveJob(job)}
            style={{
              background: C.card,
              border: `1.5px solid ${job.copilot ? "#C4B0FF" : C.line}`,
              borderRadius: 18,
              padding: 16,
              marginBottom: 14,
              boxShadow: job.copilot ? "0 4px 20px rgba(124,77,255,.1)" : "0 2px 10px rgba(0,0,0,.04)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: job.copilot ? C.ai : C.na,
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.8,
                padding: "4px 12px",
                borderBottomLeftRadius: 12,
              }}
            >
              {job.copilot ? "✦ COPILOT ON" : "MANUAL"}
            </div>

            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, paddingRight: 80 }}>{job.car}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{job.year}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0", fontSize: 12 }}>
              {[
                ["Reg no.", job.reg],
                ["Seller", job.seller],
                ["Location", job.addr],
                ["Slot", job.slot],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: C.sub, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: C.ink }}>{value}</div>
                </div>
              ))}
            </div>

            {job.copilot ? (
              <div style={{ background: C.aiBg, borderRadius: 12, padding: "9px 12px", fontSize: 11.5, color: C.purpleDark, lineHeight: 1.5, marginBottom: 12 }}>
                ✦ Pre-fetched: VAHAN cleared, 8 seller photos analysed, 2 defects flagged, OBD ready. Est. TAT{" "}
                <b>~25 min</b>.
              </div>
            ) : (
              <div style={{ background: C.naBg, borderRadius: 12, padding: "9px 12px", fontSize: 11.5, color: C.sub, lineHeight: 1.5, marginBottom: 12 }}>
                Manual checklist. No AI pre-fills. All 200 points entered by the agent. Est. TAT <b>~60 min</b>.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>
                Online quote: <b style={{ color: C.ink }}>{job.quote}</b>
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: job.copilot ? C.ai : C.purple }}>Start →</span>
            </div>
          </div>
        ))}

        <div style={{ background: C.ink, borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#A9A3B8", marginBottom: 8 }}>WHY IT MATTERS</div>
          {[
            ["Manual (Car 1)", "~60 min on-site + 24h to offer", false],
            ["Copilot (Car 2)", "~25 min on-site + instant offer", true],
          ].map(([label, description, ai]) => (
            <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 8, background: ai ? C.ai : C.na, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: ai ? "#C4B0FF" : "#7A728A", fontWeight: 600 }}>
                <b style={{ color: ai ? "#E8DCFF" : "#A9A3B8" }}>{label}</b> — {description}
              </span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #2C2440", marginTop: 10, paddingTop: 10, fontSize: 12, color: "#A9A3B8", lineHeight: 1.55 }}>
            Both cars get the <b style={{ color: "#E8DCFF" }}>Co-Pilot chat</b> — the ✦ pre-fills are what
            separates them.
          </div>
        </div>

        <div style={{ paddingBottom: 24, fontSize: 11.5, color: C.sub, textAlign: "center", lineHeight: 1.6 }}>
          Prototype · demo data, real assistant.{" "}
          <Link href="/inspector" style={{ color: C.purple, fontWeight: 700 }}>
            How this flow works →
          </Link>
        </div>
      </div>
    </Shell>
  );
}
```

## `src/app/carbecho/InspectionChat.tsx`

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_ONLY_PROMPT } from "@/lib/inspector/prompt";
import { C, resolveChecklistItem, type ItemRef } from "@/lib/inspector/flow";

/* ------------------------------------------------------------------ types */

export type ChatContext = { sectionName: string; item: string; ref: ItemRef } | null;

export type MarkRequest = {
  ref: ItemRef;
  verdict: "pass" | "fail";
  severity?: string;
  note: string;
};

type Turn = { role: "user" | "model"; text: string };

type Photo = { previewUrl: string; mimeType: string; base64: string; thumb: string };

type Reply = { section: string; item: string; severity: string; action: string };

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  photo?: string;
  spoken?: boolean;
  context?: string;
  reply?: Reply;
  target?: ItemRef | null;
  marked?: "pass" | "fail";
  error?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  context: ChatContext;
  onClearContext: () => void;
  onMark: (request: MarkRequest) => void;
  accent: string;
};

/* -------------------------------------------------------------- constants */

const LANGS = [
  { code: "hi-IN", label: "Hinglish" },
  { code: "en-IN", label: "English" },
] as const;

const MAX_IMAGE_EDGE = 1280;
const THUMB_EDGE = 160;
const SILENCE_MS = 2500;
const MAX_TURNS = 12;

const QUICK: Record<string, string[]> = {
  "hi-IN": [
    "Is item me kya kya dekhna hai?",
    "Ye photo dekh ke batao kya issue hai",
    "Isko No mark karun? Minor ya Major?",
  ],
  "en-IN": [
    "What exactly should I check for this item?",
    "Look at this photo and tell me the issue",
    "Should I mark this No — and is it Minor or Major?",
  ],
};

/** Shrink and re-encode in the browser so a 6MB phone photo doesn't cross the wire. */
async function preparePhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process that photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

  const thumbScale = Math.min(1, THUMB_EDGE / Math.max(canvas.width, canvas.height));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.max(1, Math.round(canvas.width * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(canvas.height * thumbScale));
  thumbCanvas.getContext("2d")?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

  return {
    previewUrl: dataUrl,
    mimeType: "image/jpeg",
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    thumb: thumbCanvas.toDataURL("image/jpeg", 0.6),
  };
}

/* ------------------------------------------------------------- component */

export default function InspectionChat({
  open,
  onClose,
  context,
  onClearContext,
  onMark,
  accent,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typed, setTyped] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [lang, setLang] = useState<string>("hi-IN");
  const [speakReplies, setSpeakReplies] = useState(true);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);

  // Refs shadow the state the speech callbacks read, because the recognition
  // object is created once and would otherwise close over the first render.
  const langRef = useRef(lang);
  const photoRef = useRef<Photo | null>(null);
  const contextRef = useRef<ChatContext>(context);
  const busyRef = useRef(false);
  const listeningRef = useRef(false);
  const finalRef = useRef("");
  const submittingRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(text: string, spoken: boolean) => void>(() => {});

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    });
  }, [messages, open]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langRef.current;
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((voice) => voice.lang === langRef.current) ??
        voices.find((voice) => voice.lang?.startsWith(langRef.current.slice(0, 2)));
      if (match) utterance.voice = match;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  /* ------------------------------------------------------------ sending */

  const send = useCallback(
    async (rawText: string, spoken: boolean) => {
      const attached = photoRef.current;
      const text = rawText.trim();
      if ((!text && !attached) || busyRef.current) return;

      const active = contextRef.current;
      const question = text || PHOTO_ONLY_PROMPT;

      busyRef.current = true;
      setBusy(true);
      setError("");
      setTyped("");
      setPhoto(null);

      setMessages((previous) => [
        ...previous,
        {
          id: `u${Date.now()}`,
          role: "user",
          text: question,
          photo: attached?.previewUrl,
          spoken,
          context: active ? `${active.sectionName} › ${active.item}` : undefined,
        },
      ]);

      // The checklist row the inspector is standing on is worth more to the
      // model than anything they can type, so it rides in front of the question
      // and is what the Mark button binds to when it comes back.
      const framed = [
        active ? `[Currently on checklist item "${active.item}" in section "${active.sectionName}"]` : "",
        question,
        attached ? "[inspector attached a photo]" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const withQuestion: Turn[] = [...turnsRef.current, { role: "user", text: framed }];
      turnsRef.current = withQuestion.slice(-MAX_TURNS);

      try {
        const response = await fetch("/api/inspector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turns: turnsRef.current,
            image: attached ? { mimeType: attached.mimeType, data: attached.base64 } : null,
            lang: langRef.current,
            thumb: attached?.thumb ?? null,
          }),
        });
        // A gateway or a deploy in flight answers with HTML, not JSON. Parsing
        // that straight into the chat showed the inspector a raw parser error.
        const data = await response.json().catch(() => null);
        if (!response.ok || !data) {
          throw new Error(
            data?.error || `The co-pilot could not answer right now (${response.status}).`
          );
        }

        const reply: Reply = {
          section: data.section ?? "",
          item: data.item ?? "",
          severity: data.severity ?? "",
          action: data.action ?? "",
        };
        const say: string = data.say ?? "";

        const withAnswer: Turn[] = [...turnsRef.current, { role: "model", text: say }];
        turnsRef.current = withAnswer.slice(-MAX_TURNS);

        // Bind the answer to a row: the open context wins, otherwise fall back
        // to matching the model's own section/item guess against the checklist.
        const target = active ? active.ref : resolveChecklistItem(reply.section, reply.item);

        setMessages((previous) => [
          ...previous,
          { id: `b${Date.now()}`, role: "bot", text: say, reply, target },
        ]);

        if (speakReplies) speak(say);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Something went wrong.";
        setError(message);
        setMessages((previous) => [
          ...previous,
          { id: `e${Date.now()}`, role: "bot", text: message, error: true },
        ]);
        // Hand the inspector their question and photo back. A seller's driveway
        // is a bad network, and losing the one photo of a defect to a dropped
        // request means walking back to the car to take it again.
        setTyped(question);
        if (attached) setPhoto(attached);
        if (speakReplies) speak(message);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [speak, speakReplies]
  );

  useEffect(() => {
    sendRef.current = (text: string, spoken: boolean) => void send(text, spoken);
  }, [send]);

  /* -------------------------------------------------------------- speech */

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Impl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Impl) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new Impl();
    // continuous: the inspector thinks mid-sentence. Chrome's default ends the
    // utterance on the first short silence, which cuts them off.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const clearSilence = () => {
      if (silenceRef.current) {
        clearTimeout(silenceRef.current);
        silenceRef.current = null;
      }
    };

    const armSilence = () => {
      clearSilence();
      silenceRef.current = setTimeout(() => {
        const spokenText = finalRef.current.trim();
        if (!spokenText || submittingRef.current) return;
        // A staged photo means the inspector is still composing - hold the
        // transcript in the box so they can send words and picture together.
        if (photoRef.current) return;
        submittingRef.current = true;
        listeningRef.current = false;
        setListening(false);
        try {
          recognition.stop();
        } catch {
          /* noop */
        }
        sendRef.current(spokenText, true);
      }, SILENCE_MS);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTyped((finalRef.current + interim).trim());
      armSilence();
    };

    recognition.onspeechstart = () => clearSilence();

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return; // a pause, not a failure
      clearSilence();
      listeningRef.current = false;
      setListening(false);
      setError(
        event.error === "not-allowed"
          ? "Microphone permission is blocked. Allow it in the browser address bar."
          : "The mic stopped unexpectedly. Tap the mic to try again."
      );
    };

    // Chrome ends the session on its own after a stretch of quiet even in
    // continuous mode. If the inspector is still mid-thought, start it again.
    recognition.onend = () => {
      if (submittingRef.current || busyRef.current || !listeningRef.current) return;
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      clearSilence();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggleMic = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listeningRef.current) {
      listeningRef.current = false;
      setListening(false);
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      return;
    }
    finalRef.current = typed ? `${typed} ` : "";
    submittingRef.current = false;
    listeningRef.current = true;
    setError("");
    try {
      recognition.lang = langRef.current;
      recognition.start();
      setListening(true);
    } catch {
      /* already running */
    }
  }, [typed]);

  const onPhotoChosen = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPhoto(await preparePhoto(file));
    } catch {
      setError("Could not read that photo. Try again.");
    }
  }, []);

  const applyMark = (message: Message, verdict: "pass" | "fail") => {
    if (!message.target) return;
    onMark({
      ref: message.target,
      verdict,
      severity: verdict === "fail" ? message.reply?.severity || "Minor" : undefined,
      note: message.text.slice(0, 160),
    });
    setMessages((previous) =>
      previous.map((entry) => (entry.id === message.id ? { ...entry, marked: verdict } : entry))
    );
  };

  /* ----------------------------------------------------------------- ui */

  const toggle = (on: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${on ? accent : C.line}`,
        background: on ? accent : "#fff",
        color: on ? "#fff" : C.sub,
        borderRadius: 999,
        padding: "5px 11px",
        fontSize: 11,
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(23,18,33,.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .22s",
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${open ? "0" : "102%"})`,
          width: "100%",
          maxWidth: 430,
          height: "82vh",
          background: C.bg,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(23,18,33,.25)",
          transition: "transform .26s cubic-bezier(.32,.72,0,1)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{ background: accent, color: "#fff", padding: "12px 14px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>
                Ask the Co-Pilot
              </div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Type · speak · snap a photo</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,.18)", border: "none", color: "#fff", borderRadius: 10, width: 30, height: 30, fontSize: 15, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {context && (
            <div
              style={{
                marginTop: 9,
                background: "rgba(255,255,255,.16)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 11.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ flex: 1, lineHeight: 1.35 }}>
                On: <b>{context.sectionName}</b> › {context.item}
              </span>
              <button
                onClick={onClearContext}
                style={{ background: "none", border: "none", color: "#fff", opacity: 0.75, fontSize: 11, fontWeight: 800, cursor: "pointer" }}
              >
                clear
              </button>
            </div>
          )}
        </div>

        {/* settings strip */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "9px 12px",
            background: C.card,
            borderBottom: `1px solid ${C.line}`,
            overflowX: "auto",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 800, color: C.sub, letterSpacing: 0.6 }}>REPLY IN</span>
          {LANGS.map((option) => (
            <span key={option.code}>
              {toggle(lang === option.code, option.label, () => setLang(option.code))}
            </span>
          ))}
          <span style={{ width: 1, height: 18, background: C.line, margin: "0 3px" }} />
          {toggle(speakReplies, speakReplies ? "🔊 Voice on" : "🔇 Voice off", () => {
            if (speakReplies) window.speechSynthesis?.cancel();
            setSpeakReplies(!speakReplies);
          })}
        </div>

        {/* transcript */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 12px 6px" }}>
          {messages.length === 0 && (
            <div style={{ padding: "6px 2px 12px" }}>
              <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>
                Ask anything mid-inspection. Type it, hold the mic and say it, attach a photo — or any
                combination. The answer comes back in chat, and if it lands on a checklist row you get a
                one-tap button to mark it.
              </div>
              {(QUICK[lang] ?? QUICK["hi-IN"]).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setTyped(prompt)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: C.card,
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    padding: "9px 12px",
                    fontSize: 12.5,
                    color: C.ink,
                    marginBottom: 7,
                    cursor: "pointer",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <div style={{ maxWidth: "82%" }}>
                  {message.context && (
                    <div style={{ fontSize: 9.5, color: C.sub, fontWeight: 700, textAlign: "right", marginBottom: 3 }}>
                      {message.context}
                    </div>
                  )}
                  <div style={{ background: accent, color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "9px 12px", fontSize: 13, lineHeight: 1.5 }}>
                    {message.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.photo}
                        alt="Inspector photo"
                        style={{ width: "100%", borderRadius: 9, marginBottom: 7, display: "block" }}
                      />
                    )}
                    {message.text}
                    {message.spoken && (
                      <div style={{ fontSize: 9.5, opacity: 0.8, fontWeight: 700, marginTop: 4 }}>🎙 spoken</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={message.id} style={{ marginBottom: 12, maxWidth: "88%" }}>
                <div
                  style={{
                    background: message.error ? C.failBg : C.card,
                    border: `1px solid ${message.error ? "#F5C2CE" : C.line}`,
                    borderRadius: "14px 14px 14px 4px",
                    padding: "10px 12px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: message.error ? "#8C1128" : C.ink,
                  }}
                >
                  {message.text}
                </div>

                {message.reply && (message.reply.section || message.reply.action) && (
                  <div style={{ background: C.aiBg, borderRadius: 12, padding: "8px 11px", marginTop: 6, fontSize: 11.5, color: C.purpleDark, lineHeight: 1.5 }}>
                    {message.reply.section && (
                      <div>
                        <b>{message.reply.section}</b>
                        {message.reply.item ? ` · ${message.reply.item}` : ""}
                        {message.reply.severity ? ` · ${message.reply.severity}` : ""}
                      </div>
                    )}
                    {message.reply.action && <div style={{ marginTop: 3 }}>→ {message.reply.action}</div>}
                  </div>
                )}

                {message.target && !message.marked && (
                  <div style={{ marginTop: 7 }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700, marginBottom: 5 }}>
                      Apply to “{message.target.label}”
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => applyMark(message, "fail")}
                        style={{ flex: 1, background: C.fail, color: "#fff", border: "none", borderRadius: 10, padding: "8px 0", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                      >
                        ✕ Mark No · {message.reply?.severity || "Minor"}
                      </button>
                      <button
                        onClick={() => applyMark(message, "pass")}
                        style={{ flex: 1, background: "#fff", color: C.pass, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 0", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                      >
                        ✓ Mark Yes
                      </button>
                    </div>
                  </div>
                )}

                {message.marked && (
                  <div style={{ marginTop: 7, fontSize: 11, fontWeight: 800, color: message.marked === "fail" ? C.fail : C.pass }}>
                    {message.marked === "fail" ? "✕" : "✓"} “{message.target?.label}” marked from chat
                  </div>
                )}
              </div>
            )
          )}

          {busy && (
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, padding: "2px 4px 8px" }}>
              Co-Pilot is thinking…
            </div>
          )}
        </div>

        {/* composer */}
        <div style={{ borderTop: `1px solid ${C.line}`, background: C.card, padding: "9px 10px 12px" }}>
          {photo && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumb} alt="Attached" style={{ width: 42, height: 42, borderRadius: 9, objectFit: "cover" }} />
              <span style={{ flex: 1, fontSize: 11.5, color: C.sub, fontWeight: 600 }}>
                Photo attached — add words or send it on its own.
              </span>
              <button
                onClick={() => setPhoto(null)}
                style={{ background: C.naBg, border: "none", color: C.sub, borderRadius: 8, padding: "5px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          )}

          {listening && (
            <div style={{ fontSize: 11, color: accent, fontWeight: 800, marginBottom: 6 }}>
              ● Listening — {photo ? "photo staged, tap send when done" : "pause when you're done"}
            </div>
          )}

          {error && !listening && (
            <div style={{ fontSize: 11, color: C.fail, fontWeight: 700, marginBottom: 6 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoChosen}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo"
              style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", fontSize: 17, cursor: "pointer", flexShrink: 0 }}
            >
              📷
            </button>
            <button
              onClick={toggleMic}
              disabled={!speechSupported}
              aria-label="Speak"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1.5px solid ${listening ? "transparent" : C.line}`,
                background: listening ? C.fail : "#fff",
                opacity: speechSupported ? 1 : 0.4,
                fontSize: 17,
                cursor: speechSupported ? "pointer" : "not-allowed",
                flexShrink: 0,
              }}
            >
              🎙
            </button>
            <textarea
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(typed, false);
                }
              }}
              rows={1}
              placeholder={lang === "en-IN" ? "Type your question…" : "Sawaal type kijiye…"}
              style={{
                flex: 1,
                resize: "none",
                border: `1.5px solid ${C.line}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                color: C.ink,
                outline: "none",
                maxHeight: 90,
              }}
            />
            <button
              onClick={() => void send(typed, false)}
              disabled={busy || (!typed.trim() && !photo)}
              style={{
                height: 40,
                padding: "0 15px",
                borderRadius: 12,
                border: "none",
                background: accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                opacity: busy || (!typed.trim() && !photo) ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>

          {!speechSupported && (
            <div style={{ fontSize: 10.5, color: C.sub, marginTop: 6 }}>
              This browser has no speech recognition — use Chrome or Edge for voice. Typing and photos work
              everywhere.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

## `src/app/inspector/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import InspectorCopilot from "./InspectorCopilot";
import { BRAND } from "@/lib/inspector/prompt";

export const metadata: Metadata = {
  title: "CarBecho Inspection Co-Pilot",
  description:
    "A hands-free voice assistant for field inspectors running a 200-point used-car inspection. Speak the fault, hear the call.",
  // Unlisted: reachable by direct link only, not in the sitemap or nav.
  robots: { index: false, follow: false },
};

const STEPS: { title: string; body: string }[] = [
  {
    title: "1 · Pick the job, verify, pair",
    body:
      "Two jobs sit in the day's list — one Manual, one with Copilot pre-fills. Scan the RC, pair the OBD dongle, and the timer starts against a 60-minute baseline.",
  },
  {
    title: "2 · Work the 200-point checklist",
    body:
      "Eight sections, forty grouped checks. A Copilot job arrives with photo-AI, OBD and VAHAN pre-fills the inspector accepts or overrides; a Manual job is entered by hand.",
  },
  {
    title: "3 · Ask the Co-Pilot from any row",
    body:
      "Every checklist row has a 💬 Ask button. It opens the chat with that row already loaded as context, so the answer is about the thing the inspector is standing in front of.",
  },
  {
    title: "4 · Mark the row from the answer",
    body:
      "When the reply lands on a checklist item, the chat offers a one-tap Mark No · severity or Mark Yes. The row fills in, tagged 💬 via chat, and the reasoning is kept with it.",
  },
  {
    title: "5 · Report and trail",
    body:
      "The report totals the score, splits defects by severity for the pricing engine, and shows how many rows came from pre-fills versus chat. Every exchange also lands in the shared findings log.",
  },
];

const INPUTS: { label: string; body: string }[] = [
  { label: "Type only", body: "Ask a question in the box and send." },
  { label: "Speak only", body: "Tap the mic, talk, pause — it sends itself after 2.5s of silence." },
  { label: "Photo only", body: "Attach a photo with no words; the assistant is asked what it sees." },
  { label: "Photo + typing", body: "Attach, then type what the photo does not show." },
  {
    label: "Photo + speech",
    body:
      "With a photo staged, the mic transcribes into the box instead of auto-sending — so words and picture go together on one tap.",
  },
  {
    label: "Speech, then edit",
    body: "Dictate, correct a word by hand, then send. The mic appends to whatever is already typed.",
  },
];

export default function InspectorPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-5 pt-10 sm:pt-14">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 dark:border-violet-900/60 dark:bg-violet-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            New · Interactive inspection flow
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            The whole inspection, with the Co-Pilot in the chat
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            The tool below is voice-first: one question, one spoken answer. But on a real inspection the
            seller keeps asking, and the inspector keeps needing to look something up mid-check. So the
            assistant now lives inside the job itself — as a chat on every checklist row, where an answer can
            be read back, scrolled, and turned into a mark.
          </p>
          <Link
            href="/carbecho"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Open the {BRAND} inspection flow →
          </Link>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Demo job data · a real Gemini-backed assistant · best on a phone-width window.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">How the flow works</h3>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step) => (
              <li key={step.title} className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Every way to ask
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Text, voice and photo are three inputs on one composer, and any combination of them is a valid
            message.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {INPUTS.map((input) => (
              <div
                key={input.label}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <dt className="text-sm font-semibold">{input.label}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{input.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Language and voice are the inspector&apos;s call
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>
              <b className="text-slate-800 dark:text-slate-100">Reply language:</b> Hinglish or English,
              switchable mid-conversation. The toggle is sent with the request and pins the reply language —
              asking the model to &ldquo;mirror the inspector&rdquo; was not reliable.
            </li>
            <li>
              <b className="text-slate-800 dark:text-slate-100">Voice out:</b> on by default, one tap to mute.
              The same choice drives the text in the bubble and the speech, so a noisy forecourt or a quiet
              showroom both work.
            </li>
            <li>
              <b className="text-slate-800 dark:text-slate-100">Voice in:</b> the mic keeps listening through
              pauses and only submits after real silence, because inspectors think mid-sentence.
            </li>
            <li>
              <b className="text-slate-800 dark:text-slate-100">Guardrail:</b> the assistant never invents a
              defect code, a star rating or a repair price — those come from the rules engine. It says what to
              log instead.
            </li>
          </ul>
        </div>

        <hr className="mt-10 border-slate-200 dark:border-slate-700" />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          The original voice-only tool
        </p>
      </section>
      <InspectorCopilot />
    </>
  );
}
```

## `src/app/inspector/InspectorCopilot.tsx`

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND, PHOTO_ONLY_PROMPT, STARTER_PROMPTS } from "@/lib/inspector/prompt";

type Photo = { previewUrl: string; mimeType: string; base64: string; thumb: string };

type Finding = {
  id: string;
  question: string;
  photoUrl: string;
  thumbUrl: string;
  say: string;
  section: string;
  item: string;
  severity: string;
  action: string;
  saved: boolean;
};

type Turn = { role: "user" | "model"; text: string };

type Status = "idle" | "listening" | "thinking" | "speaking";

const LANGS = [
  { code: "hi-IN", label: "Hinglish" },
  { code: "en-IN", label: "English" },
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  Major: "bg-amber-100 text-amber-900 border-amber-200",
  Minor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_COPY: Record<Status, string> = {
  idle: "Tap the mic and describe the fault",
  listening: "Listening — pause when you're done",
  thinking: "Checking the checklist…",
  speaking: "Answering…",
};

const SESSION_KEY = "carbecho-inspector-session-v1";
const SESSION_CAP = 50;

const MAX_IMAGE_EDGE = 1280;
const THUMB_EDGE = 160;

/** Shrink and re-encode in the browser so a 6MB phone photo doesn't cross the wire. */
async function preparePhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process that photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

  // A separate tiny copy for the shared log, so history stays cheap to store
  // and fast to load however many findings pile up.
  const thumbScale = Math.min(1, THUMB_EDGE / Math.max(canvas.width, canvas.height));
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = Math.max(1, Math.round(canvas.width * thumbScale));
  thumbCanvas.height = Math.max(1, Math.round(canvas.height * thumbScale));
  thumbCanvas.getContext("2d")?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

  return {
    previewUrl: dataUrl,
    mimeType: "image/jpeg",
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    thumb: thumbCanvas.toDataURL("image/jpeg", 0.6),
  };
}

type SessionState = { findings: Finding[]; turns: Turn[] };

/**
 * The session list is what the inspector reads back at the end of a car. It
 * used to die on refresh, a crashed tab, or a phone locking mid-inspection -
 * and if the shared-log save had failed, that was the only copy.
 *
 * Only the 160px thumbnail is kept, never the 1280px original: a handful of
 * full-size photos would blow through the ~5MB localStorage budget.
 */
function loadSession(): SessionState {
  if (typeof window === "undefined") return { findings: [], turns: [] };
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return { findings: [], turns: [] };
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      turns: Array.isArray(parsed.turns) ? parsed.turns : [],
    };
  } catch {
    return { findings: [], turns: [] };
  }
}

function saveSession(findings: Finding[], turns: Turn[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = findings.slice(0, SESSION_CAP).map((finding) => ({
      ...finding,
      photoUrl: finding.thumbUrl, // drop the full-size copy before storing
    }));
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ findings: trimmed, turns }));
  } catch {
    // Private mode, a full quota, or storage disabled. Not worth interrupting
    // the inspector over - the shared log is the durable record.
  }
}

export default function InspectorCopilot() {
  const [status, setStatus] = useState<Status>("idle");
  const [lang, setLang] = useState<string>("hi-IN");
  const [handsFree, setHandsFree] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [pauseMs, setPauseMs] = useState(2500);

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  const photoRef = useRef<Photo | null>(null);
  const handsFreeRef = useRef(false);
  const langRef = useRef("hi-IN");
  const askRef = useRef<(question: string) => void>(() => {});
  const finalRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const pauseMsRef = useRef(2500);
  const listeningRef = useRef(false);
  const findingsRef = useRef<HTMLElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const restored = loadSession();
    if (restored.findings.length) setFindings(restored.findings);
    if (restored.turns.length) turnsRef.current = restored.turns;
  }, []);

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    pauseMsRef.current = pauseMs;
  }, [pauseMs]);

  const speak = useCallback(
    (text: string, onDone: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onDone();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((voice) => voice.lang === lang) ??
        voices.find((voice) => voice.lang?.startsWith(lang.slice(0, 2)));
      if (match) utterance.voice = match;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || busyRef.current) return;
    try {
      setTranscript("");
      setError("");
      finalRef.current = "";
      submittingRef.current = false;
      listeningRef.current = true;
      recognition.lang = lang;
      recognition.start();
      setStatus("listening");
    } catch {
      /* already running */
    }
  }, [lang]);

  const ask = useCallback(
    async (question: string) => {
      const attached = photoRef.current;
      const trimmed = question.trim() || (attached ? PHOTO_ONLY_PROMPT : "");
      if (!trimmed || busyRef.current) return;

      busyRef.current = true;
      listeningRef.current = false;
      setStatus("thinking");
      setError("");
      setTranscript(trimmed);

      const historyText = attached ? `${trimmed} [inspector attached a photo]` : trimmed;
      const withQuestion: Turn[] = [...turnsRef.current, { role: "user", text: historyText }];
      turnsRef.current = withQuestion.slice(-12);

      try {
        const response = await fetch("/api/inspector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turns: turnsRef.current,
            image: attached ? { mimeType: attached.mimeType, data: attached.base64 } : null,
            lang: langRef.current,
            thumb: attached?.thumb ?? null,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "The co-pilot could not answer.");
        }

        const finding: Finding = {
          id: `${Date.now()}`,
          question: trimmed,
          photoUrl: attached?.previewUrl ?? "",
          thumbUrl: attached?.thumb ?? "",
          say: data.say ?? "",
          section: data.section ?? "",
          item: data.item ?? "",
          severity: data.severity ?? "",
          action: data.action ?? "",
          saved: data.saved === true,
        };

        const withAnswer: Turn[] = [...turnsRef.current, { role: "model", text: finding.say }];
        turnsRef.current = withAnswer.slice(-12);
        setFindings((previous) => {
          const next = [finding, ...previous];
          saveSession(next, turnsRef.current);
          return next;
        });
        setPhoto(null);
        // The findings list sits below the fold on a phone; bring it up.
        requestAnimationFrame(() =>
          findingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
        setStatus("speaking");

        speak(finding.say, () => {
          busyRef.current = false;
          setStatus("idle");
          if (handsFreeRef.current) setTimeout(startListening, 350);
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Something went wrong.";
        setError(message);
        // The inspector is under a car and not looking at the screen. Say it.
        setStatus("speaking");
        speak(message, () => {
          busyRef.current = false;
          setStatus("idle");
        });
      }
    },
    [speak, startListening]
  );

  useEffect(() => {
    askRef.current = (question: string) => void ask(question);
  }, [ask]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    // continuous: the inspector thinks mid-sentence. Chrome's default ends the
    // whole utterance on the first short silence, which cut people off.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const clearSilenceTimer = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    // We decide when the sentence is over, not the browser: submit only after
    // pauseMs of true silence following something worth sending.
    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        const spoken = finalRef.current.trim();
        if (!spoken || submittingRef.current) return;
        submittingRef.current = true;
        try {
          recognition.stop();
        } catch {
          /* noop */
        }
        askRef.current(spoken);
      }, pauseMsRef.current);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
      armSilenceTimer();
    };

    recognition.onspeechstart = () => clearSilenceTimer();

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return; // a pause, not a failure
      clearSilenceTimer();
      setStatus("idle");
      if (event.error === "not-allowed") {
        setError("Microphone permission is blocked. Allow it in the browser address bar.");
      } else if (event.error === "aborted") {
        return;
      } else {
        setError("The mic stopped unexpectedly. Tap Speak to try again.");
      }
    };

    // Chrome ends the session on its own after a stretch of silence even in
    // continuous mode. If the inspector is still mid-thought, start it again.
    recognition.onend = () => {
      if (submittingRef.current || busyRef.current || !listeningRef.current) return;
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      clearSilenceTimer();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const onPhotoChosen = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPhoto(await preparePhoto(file));
    } catch {
      setError("Could not read that photo. Try again.");
    }
  }, []);

  const startNewCar = useCallback(() => {
    setFindings([]);
    turnsRef.current = [];
    setTranscript("");
    setPhoto(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch {
        /* storage unavailable - nothing to clear */
      }
    }
  }, []);

  const sendNow = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    submittingRef.current = true;
    listeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    const spoken = finalRef.current.trim();
    if (spoken) void ask(spoken);
    else setStatus("idle");
  }, [ask]);

  const stopEverything = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    submittingRef.current = true;
    listeningRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    busyRef.current = false;
    setHandsFree(false);
    setStatus("idle");
  }, []);

  const micLabel = useMemo(() => {
    if (status === "listening") return "Send";
    if (status === "thinking") return "…";
    if (status === "speaking") return "Speaking";
    return "Speak";
  }, [status]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          {BRAND} · Field tool
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Inspection Co-Pilot
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Hands-free help for a 200-point used-car inspection. Snap the part, describe the fault out
          loud in Hinglish or English — it comes back with the section, the severity and what to mark.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => (status === "listening" ? sendNow() : startListening())}
              disabled={!speechSupported || status === "thinking"}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-sm font-semibold text-white transition disabled:opacity-50 ${
                status === "listening"
                  ? "animate-pulse bg-red-600"
                  : "bg-slate-900 hover:bg-slate-700 dark:bg-teal-600 dark:hover:bg-teal-500"
              }`}
            >
              {micLabel}
            </button>
            <div>
              <p className="text-sm font-medium">{STATUS_COPY[status]}</p>
              <p className="text-xs text-slate-500">
                {status === "listening"
                  ? "Take your time — pauses are fine"
                  : handsFree
                    ? "Hands-free on — it keeps listening"
                    : "Tap to talk"}
              </p>
              {status === "listening" && (
                <button
                  type="button"
                  onClick={stopEverything}
                  className="mt-1 text-xs font-medium text-slate-500 underline"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs dark:border-slate-700">
              {LANGS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setLang(option.code)}
                  className={`px-3 py-1.5 font-medium transition ${
                    lang === option.code
                      ? "bg-slate-900 text-white dark:bg-teal-600"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              Pause
              <select
                value={pauseMs}
                onChange={(event) => setPauseMs(Number(event.target.value))}
                className="rounded-md border border-slate-200 bg-transparent px-1.5 py-1 dark:border-slate-700"
              >
                <option value={1500}>1.5s</option>
                <option value={2500}>2.5s</option>
                <option value={4000}>4s</option>
                <option value={6000}>6s</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={handsFree}
                onChange={(event) => setHandsFree(event.target.checked)}
                className="h-3.5 w-3.5 accent-teal-600"
              />
              Hands-free mode
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoChosen}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium transition hover:border-teal-600 hover:text-teal-700 dark:border-slate-700"
          >
            {photo ? "Replace photo" : "Add photo"}
          </button>

          {photo && (
            <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-2 pr-3 dark:border-teal-900 dark:bg-teal-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt="Attached inspection photo"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="text-xs text-teal-900 dark:text-teal-100">
                Attached — ask your question
              </span>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="text-xs font-semibold text-teal-900 underline dark:text-teal-100"
              >
                Remove
              </button>
            </div>
          )}

          {photo && (
            <button
              type="button"
              onClick={() => void ask("")}
              disabled={status === "thinking"}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Just read the photo
            </button>
          )}
        </div>

        {transcript && (
          <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            “{transcript}”
          </p>
        )}

        {!speechSupported && (
          <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This browser has no speech recognition. Use Chrome or Edge for voice — photos and typing
            still work.
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}

        <form
          className="mt-5 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const question = typed;
            setTyped("");
            void ask(question);
          }}
        >
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="…or type the fault"
            className="flex-1 rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={!typed.trim() || status === "thinking"}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-teal-600"
          >
            Ask
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void ask(prompt)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-teal-600 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section ref={findingsRef} className="mt-8 scroll-mt-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Findings this session ({findings.length})
          </h2>
          <div className="flex items-center gap-4">
            {findings.length > 0 && (
              <button
                type="button"
                onClick={startNewCar}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                Start a new car
              </button>
            )}
            <Link
              href="/inspector/history"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              View the full log →
            </Link>
          </div>
        </div>

        {findings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing logged yet. Every answer lands here so you can copy it into the inspection app,
            and stays put if the page reloads.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {findings.map((finding) => (
              <li
                key={finding.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex gap-4">
                  {finding.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={finding.photoUrl}
                      alt="Inspection photo for this finding"
                      className="h-20 w-20 flex-none rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">“{finding.question}”</p>
                    <p className="mt-2 text-sm leading-relaxed">{finding.say}</p>
                  </div>
                </div>

                {(finding.section || finding.severity || finding.item) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {finding.severity && (
                      <span
                        className={`rounded-full border px-2.5 py-1 font-semibold ${
                          SEVERITY_STYLES[finding.severity] ??
                          "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {finding.severity}
                      </span>
                    )}
                    {finding.section && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {finding.section}
                      </span>
                    )}
                    {finding.item && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {finding.item}
                      </span>
                    )}
                  </div>
                )}

                {finding.action && (
                  <p className="mt-3 border-l-2 border-teal-600 pl-3 text-xs text-slate-600 dark:text-slate-300">
                    {finding.action}
                  </p>
                )}

                {!finding.saved && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-500">
                    Not saved to the shared log — this one is only on this screen.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-xs leading-relaxed text-slate-400">
        Guidance only. Star ratings, defect codes and repair estimates must come from the
        inspection app&apos;s own rules engine, not from this assistant.
      </p>
    </main>
  );
}
```

## `src/app/inspector/history/page.tsx`

```tsx
import type { Metadata } from "next";
import HistoryView from "./HistoryView";

export const metadata: Metadata = {
  title: "Findings log · CarBecho Inspection Co-Pilot",
  description: "Every finding logged by the inspection co-pilot, newest first.",
  robots: { index: false, follow: false },
};

export default function InspectorHistoryPage() {
  return <HistoryView />;
}
```

## `src/app/inspector/history/HistoryView.tsx`

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Finding = {
  id: string;
  created_at: string;
  question: string;
  say: string;
  section: string;
  item: string;
  severity: string;
  action: string;
  thumb: string | null;
  has_photo: boolean;
};

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  Major: "bg-amber-100 text-amber-900 border-amber-200",
  Minor: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const SEVERITY_ORDER = ["Critical", "Major", "Minor"];

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function HistoryView() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All");
  const [section, setSection] = useState("All");
  const [photosOnly, setPhotosOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/inspector/findings");
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data?.error || "Could not load the log.");
        setFindings(data.findings ?? []);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => {
    const unique = new Set(findings.map((finding) => finding.section).filter(Boolean));
    return ["All", ...Array.from(unique).sort()];
  }, [findings]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return findings.filter((finding) => {
      if (severity !== "All" && finding.severity !== severity) return false;
      if (section !== "All" && finding.section !== section) return false;
      if (photosOnly && !finding.has_photo) return false;
      if (!needle) return true;
      return [finding.question, finding.say, finding.item, finding.action]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [findings, query, severity, section, photosOnly]);

  // Group into days, preserving the newest-first order the API returned.
  const days = useMemo(() => {
    const grouped: { label: string; items: Finding[] }[] = [];
    for (const finding of visible) {
      const label = dayLabel(finding.created_at);
      const last = grouped[grouped.length - 1];
      if (last && last.label === label) last.items.push(finding);
      else grouped.push({ label, items: [finding] });
    }
    return grouped;
  }, [visible]);

  const criticalCount = findings.filter((finding) => finding.severity === "Critical").length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-7">
        <Link href="/inspector" className="text-xs font-medium text-teal-700 hover:underline">
          ← Back to the co-pilot
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Findings log</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {loading
            ? "Loading…"
            : `${findings.length} finding${findings.length === 1 ? "" : "s"} logged${
                criticalCount ? ` · ${criticalCount} critical` : ""
              }`}
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-5 mb-6 border-b border-slate-200 bg-white/90 px-5 pb-4 pt-2 backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search findings — part, symptom, action…"
          className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-slate-700"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {["All", ...SEVERITY_ORDER].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSeverity(option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                severity === option
                  ? "border-slate-900 bg-slate-900 text-white dark:border-teal-600 dark:bg-teal-600"
                  : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {option}
            </button>
          ))}

          <select
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className="rounded-full border border-slate-200 bg-transparent px-3 py-1.5 text-xs dark:border-slate-700"
          >
            {sections.map((option) => (
              <option key={option} value={option}>
                {option === "All" ? "All sections" : option}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={photosOnly}
              onChange={(event) => setPhotosOnly(event.target.checked)}
              className="h-3.5 w-3.5 accent-teal-600"
            />
            With photo
          </label>

          {visible.length !== findings.length && (
            <span className="text-xs text-slate-500">{visible.length} shown</span>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {!loading && !error && findings.length === 0 && (
        <p className="text-sm text-slate-500">
          Nothing logged yet. Findings appear here as inspectors use the co-pilot.
        </p>
      )}

      {!loading && !error && findings.length > 0 && visible.length === 0 && (
        <p className="text-sm text-slate-500">No findings match those filters.</p>
      )}

      {days.map((day) => (
        <section key={day.label} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {day.label}
          </h2>
          <ul className="space-y-3">
            {day.items.map((finding) => (
              <li
                key={finding.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex gap-4">
                  {finding.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={finding.thumb}
                      alt="Inspection photo"
                      className="h-16 w-16 flex-none rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-xs text-slate-500">“{finding.question}”</p>
                      <span className="flex-none text-xs text-slate-400">
                        {timeLabel(finding.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{finding.say}</p>
                  </div>
                </div>

                {(finding.severity || finding.section || finding.item) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {finding.severity && (
                      <span
                        className={`rounded-full border px-2.5 py-1 font-semibold ${
                          SEVERITY_STYLES[finding.severity] ??
                          "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {finding.severity}
                      </span>
                    )}
                    {finding.section && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {finding.section}
                      </span>
                    )}
                    {finding.item && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {finding.item}
                      </span>
                    )}
                  </div>
                )}

                {finding.action && (
                  <p className="mt-3 border-l-2 border-teal-600 pl-3 text-xs text-slate-600 dark:text-slate-300">
                    {finding.action}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
```

## `src/app/api/inspector/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { INSPECTOR_SYSTEM_PROMPT, RESPONSE_SCHEMA } from "@/lib/inspector/prompt";
import { saveFinding } from "@/lib/inspector/store";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Turn = { role: "user" | "model"; text: string };
type Image = { mimeType: string; data: string };

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/**
 * Tried in order. Gemini quota is per model, so a second model is not just a
 * backup for outages - it doubles the free tier's daily allowance and covers
 * the 503s the newer models throw under load.
 *
 * 2.5-flash leads on answer quality for this task; 3.5-flash-lite is faster
 * (1.5s vs 2.3s measured) and rejects thinkingConfig outright, hence the flag.
 */
const MODELS: { name: string; disableThinking: boolean }[] = [
  { name: "gemini-2.5-flash", disableThinking: true },
  { name: "gemini-3.5-flash-lite", disableThinking: false },
];

const MAX_TURNS = 12;
const MAX_CHARS = 1200;
const MAX_IMAGE_BYTES = 4_000_000;
const MAX_THUMB_BYTES = 60_000;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  if (isRateLimited(request, "inspector", 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    turns?: Turn[];
    image?: Image | null;
    lang?: string;
    thumb?: string | null;
  } | null;

  const turns = Array.isArray(body?.turns) ? body!.turns : null;

  if (!turns || turns.length === 0) {
    return NextResponse.json({ error: "No conversation turns supplied." }, { status: 400 });
  }

  // The UI's language toggle is authoritative. Left to "mirror the inspector"
  // the model answered English questions in Hinglish.
  const languageRule =
    body?.lang === "en-IN"
      ? "\n\nLANGUAGE FOR THIS REPLY: answer in English only. No Hindi words."
      : "\n\nLANGUAGE FOR THIS REPLY: answer in conversational Hinglish.";

  const image = body?.image ?? null;
  if (image) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.mimeType)) {
      return NextResponse.json({ error: "Unsupported image format." }, { status: 400 });
    }
    if (typeof image.data !== "string" || image.data.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
    }
  }

  const contents = turns
    .slice(-MAX_TURNS)
    .filter((turn) => typeof turn?.text === "string" && turn.text.trim().length > 0)
    .map((turn) => ({
      role: turn.role === "model" ? "model" : "user",
      parts: [{ text: turn.text.slice(0, MAX_CHARS) }] as Part[],
    }));

  if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
    return NextResponse.json({ error: "Last turn must be from the inspector." }, { status: 400 });
  }

  // The photo belongs to the question being asked right now, so it rides on the final user turn.
  if (image) {
    contents[contents.length - 1].parts.unshift({
      inlineData: { mimeType: image.mimeType, data: image.data },
    });
  }

  try {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    };

    let response: Response | null = null;
    let usedModel = "";
    let lastStatus = 0;
    let lastDetail = "";

    for (const model of MODELS) {
      const attempt = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: INSPECTOR_SYSTEM_PROMPT + languageRule }] },
            generationConfig: model.disableThinking
              ? // Thinking costs ~10s per turn on 2.5-flash and adds nothing here.
                { ...generationConfig, thinkingConfig: { thinkingBudget: 0 } }
              : generationConfig,
          }),
        }
      );

      if (attempt.ok) {
        response = attempt;
        usedModel = model.name;
        break;
      }

      lastStatus = attempt.status;
      lastDetail = await attempt.text();
      console.error("[inspector] %s failed", model.name, attempt.status, lastDetail.slice(0, 300));

      // Only quota and overload are worth retrying elsewhere. A 400 is our bug
      // and will fail identically on every model.
      if (attempt.status !== 429 && attempt.status !== 503) break;
    }

    if (usedModel !== MODELS[0].name && response) {
      console.warn("[inspector] answered by fallback model", usedModel);
    }

    if (!response) {
      const detail = lastDetail;
      const status = lastStatus;

      // Don't hide a rate limit behind a generic failure - the inspector needs
      // to know it is a wait, not a break. Reaching here means every model in
      // MODELS refused, so the whole free-tier allowance is gone, not just one.
      if (status === 429) {
        // Google returns two very different limits through the same status.
        // Saying "wait a minute" when the day's quota is gone sends the
        // inspector back to a tool that cannot answer for hours.
        const perDay = /PerDay|RequestsPerDay/i.test(detail);
        const seconds = detail.match(/retry in ([\d.]+)s/i)?.[1];
        const cap = detail.match(/limit:\s*(\d+)/i)?.[1];

        const error = perDay
          ? `Daily quota used up on every model${
              cap ? ` (${cap} requests a day each on the free tier)` : ""
            }. It resets at midnight US Pacific — about 12:30 PM India time. Enabling billing on the API key removes the cap.`
          : `Too many requests just now.${
              seconds ? ` Try again in about ${Math.ceil(Number(seconds))} seconds.` : ""
            }`;

        return NextResponse.json({ error }, { status: 429 });
      }

      if (status === 503) {
        return NextResponse.json(
          { error: "The model is overloaded right now. Ask again in a moment." },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: "The co-pilot could not reach the model." }, { status: 502 });
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!raw.trim()) {
      return NextResponse.json({ error: "The co-pilot returned an empty answer." }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = { say: raw };
    }

    const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    const answer = {
      say: str(parsed.say) || "Sir, ye samajh nahi aaya. Ek baar dobara boliye.",
      section: str(parsed.section),
      item: str(parsed.item),
      severity: str(parsed.severity),
      action: str(parsed.action),
    };

    const thumb =
      typeof body?.thumb === "string" && body.thumb.length <= MAX_THUMB_BYTES
        ? body.thumb
        : null;

    const saved = await saveFinding({
      ...answer,
      question: contents[contents.length - 1].parts
        .filter((part): part is { text: string } => "text" in part)
        .map((part) => part.text)
        .join(" ")
        .slice(0, MAX_CHARS),
      lang: body?.lang === "en-IN" ? "en-IN" : "hi-IN",
      thumb,
      has_photo: Boolean(image),
    });

    return NextResponse.json({ ...answer, saved, model: usedModel });
  } catch (error) {
    console.error("[inspector] request failed", error);
    return NextResponse.json({ error: "The co-pilot is unavailable right now." }, { status: 500 });
  }
}
```

## `src/app/api/inspector/findings/route.ts`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  const { data, error } = await createPublicClient()
    .from("inspection_findings")
    .select("id, created_at, question, say, section, item, severity, action, thumb, has_photo")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[inspector] history read failed", error.message);
    return NextResponse.json({ error: "Could not load the findings log." }, { status: 502 });
  }

  return NextResponse.json({ findings: data ?? [] });
}
```

## `src/lib/inspector/flow.ts`

```tsx
/**
 * Data + helpers for the CarBecho interactive inspection flow at /carbecho.
 *
 * The checklist here is a demo-scale stand-in for the real 200-point sheet:
 * 8 sections, 40 grouped checks, weighted to the same point totals a field
 * inspector sees. The `ai` hints are the pre-fills a Co-Pilot job arrives with.
 */

export type Severity = "Minor" | "Major" | "Critical";

export type AiHint = { v: "pass" | "fail"; src: string; sev?: Severity };

export type ChecklistItem = { n: string; ai?: AiHint };

export type Section = {
  id: string;
  name: string;
  pts: number;
  icon: string;
  items: ChecklistItem[];
};

export type Job = {
  id: string;
  car: string;
  year: string;
  reg: string;
  seller: string;
  slot: string;
  addr: string;
  quote: string;
  copilot: boolean;
};

/** Palette. Kept in one place so the flow and the chat sheet never drift. */
export const C = {
  purple: "#5B2EDD",
  purpleDark: "#3C1AA6",
  ink: "#171221",
  sub: "#6B6478",
  bg: "#F5F3FA",
  card: "#FFFFFF",
  line: "#E7E2F2",
  pass: "#0E9F6E",
  passBg: "#E3F5EE",
  fail: "#E0284A",
  failBg: "#FCE8ED",
  na: "#8B8598",
  naBg: "#EFEDF4",
  amber: "#C77700",
  amberBg: "#FFF3E0",
  ai: "#7C4DFF",
  aiBg: "#F1EBFF",
} as const;

export const SECTIONS: Section[] = [
  {
    id: "body",
    name: "Bodywork & Paint",
    pts: 32,
    icon: "🚗",
    items: [
      { n: "Panel paint depth — all 12 panels", ai: { v: "pass", src: "Photo AI · paint-meter OCR: 98–128µ, OEM range" } },
      { n: "Dents / scratches (exterior 360°)", ai: { v: "fail", src: "Photo AI: dent detected, rear-left door", sev: "Minor" } },
      { n: "Repaint / putty detection", ai: { v: "fail", src: "Photo AI: repaint signature, front bumper", sev: "Minor" } },
      { n: "Grille & bumper support structure" },
      { n: "License plate & mounting bracket" },
      { n: "Structural / pillar damage" },
      { n: "Door gaps & panel alignment (accident-repair signal)" },
      { n: "Door seals & panel lining" },
      { n: "Side mirrors — condition & alignment" },
      { n: "Windshield & glass condition", ai: { v: "pass", src: "Photo AI: no cracks or chips detected" } },
    ],
  },
  {
    id: "lights",
    name: "Lights & Signals",
    pts: 18,
    icon: "💡",
    items: [
      { n: "Headlamps — low & high beam" },
      { n: "Tail / brake / reverse lamps" },
      { n: "Indicators & hazard function" },
      { n: "Lamp casings — chips / moisture", ai: { v: "pass", src: "Photo AI: casings intact" } },
    ],
  },
  {
    id: "engine",
    name: "Engine & Transmission",
    pts: 38,
    icon: "⚙️",
    items: [
      { n: "Cold start & idle stability", ai: { v: "pass", src: "OBD: idle RPM 780, stable" } },
      { n: "Engine error codes (OBD scan)", ai: { v: "fail", src: "OBD: P0420 — catalytic efficiency low", sev: "Major" } },
      { n: "Oil condition & leaks" },
      { n: "Radiator / coolant / hoses" },
      { n: "Battery health", ai: { v: "pass", src: "OBD: 12.6V, CCA 92%" } },
      { n: "Secondary diagnostic device (engine bay)" },
      { n: "Clutch / gearshift quality" },
    ],
  },
  {
    id: "boot",
    name: "Boot & Tools",
    pts: 10,
    icon: "🧰",
    items: [
      { n: "Boot floor & lining — water ingress, damage" },
      { n: "Spare tyre — present & condition" },
      { n: "Jack & wheel brace — present & condition" },
      { n: "Toolkit — present & complete" },
    ],
  },
  {
    id: "under",
    name: "Undercarriage & Suspension",
    pts: 22,
    icon: "🔩",
    items: [
      { n: "Chassis rust / accident repair" },
      { n: "Suspension bounce & noise" },
      { n: "Exhaust leaks & mounting" },
      { n: "Underbody oil seepage" },
    ],
  },
  {
    id: "tyres",
    name: "Tyres & Wheels",
    pts: 14,
    icon: "🛞",
    items: [
      { n: "Tread depth — all 5 tyres", ai: { v: "pass", src: "Photo AI: 4.2–5.1mm, above limit" } },
      { n: "Uneven wear (alignment signal)" },
      { n: "Rim damage / bends", ai: { v: "pass", src: "Photo AI: no visible rim damage" } },
      { n: "Manufacturing year match" },
    ],
  },
  {
    id: "interior",
    name: "Interior & Electronics",
    pts: 34,
    icon: "🪑",
    items: [
      { n: "Upholstery — tears, stains, odour", ai: { v: "pass", src: "Photo AI: upholstery clean" } },
      { n: "Seat adjust / recline / rails" },
      { n: "AC cooling & blower speeds" },
      { n: "Power windows & locks" },
      { n: "Infotainment / horn / wipers" },
      { n: "Floor mats & headliner — stains, water damage" },
      { n: "Airbag & warning lamps", ai: { v: "pass", src: "OBD: no SRS faults" } },
    ],
  },
  {
    id: "drive",
    name: "Road Test",
    pts: 26,
    icon: "🛣️",
    items: [
      { n: "Acceleration & power delivery" },
      { n: "Braking — bite, pull, ABS", ai: { v: "pass", src: "OBD: ABS active, no faults" } },
      { n: "Steering play & alignment" },
      { n: "NVH — cabin noise / vibration" },
      { n: "Odometer vs OBD reading", ai: { v: "pass", src: "OBD 48,212 km = odo reading" } },
    ],
  },
  {
    id: "docs",
    name: "Documents & History",
    pts: 16,
    icon: "📄",
    items: [
      { n: "RC verification (owner, VIN)", ai: { v: "pass", src: "VAHAN API: RC valid, 1st owner, VIN match" } },
      { n: "Insurance validity", ai: { v: "pass", src: "VAHAN API: valid till Mar 2027" } },
      { n: "Hypothecation / loan status", ai: { v: "fail", src: "VAHAN API: HDFC hypothecation active", sev: "Major" } },
      { n: "Challan / blacklist check", ai: { v: "pass", src: "VAHAN API: no pending challans" } },
      { n: "Service history records" },
    ],
  },
];

export const JOBS: Job[] = [
  {
    id: "manual",
    car: "Maruti Baleno Zeta 1.2",
    year: "2021 · Petrol · 48,212 km",
    reg: "HR 26 DQ 5544",
    seller: "Ankit Sharma",
    slot: "10:30 AM",
    addr: "Sector 57, Gurugram · 4.2 km",
    quote: "₹6.10L",
    copilot: false,
  },
  {
    id: "copilot",
    car: "Honda City ZX 1.5 CVT",
    year: "2022 · Petrol · 31,850 km",
    reg: "DL 7C AK 9901",
    seller: "Priya Mehta",
    slot: "12:00 PM",
    addr: "Dwarka Sec 12, Delhi · 6.8 km",
    quote: "₹9.40L",
    copilot: true,
  },
];

export const AI_HINT_COUNT = SECTIONS.reduce(
  (total, section) => total + section.items.filter((item) => item.ai).length,
  0
);

export const TOTAL_CHECKS = SECTIONS.reduce((total, section) => total + section.items.length, 0);

export type ItemRef = { sectionIndex: number; itemIndex: number; label: string; section: string };

const STOP = new Set([
  "the", "and", "for", "with", "all", "any", "car", "check", "checks", "condition", "vehicle",
]);

const words = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 2 && !STOP.has(word));

const overlaps = (word: string, target: string[]) =>
  target.some((candidate) => candidate === word || candidate.startsWith(word) || word.startsWith(candidate));

/**
 * The model answers with its own free-text section and item names, which come
 * from the generic 200-point vocabulary and rarely match a checklist row
 * verbatim ("Fuel leakage" vs "Underbody oil seepage"). Score every row on word
 * overlap - item words count double - and only claim a match above a floor,
 * because silently marking the wrong row is worse than offering no button.
 */
export function resolveChecklistItem(sectionGuess: string, itemGuess: string): ItemRef | null {
  const itemWords = words(itemGuess);
  const sectionWords = words(sectionGuess);
  if (itemWords.length === 0 && sectionWords.length === 0) return null;

  let best: ItemRef | null = null;
  let bestScore = 0;

  SECTIONS.forEach((section, sectionIndex) => {
    const sectionTokens = words(section.name);
    section.items.forEach((item, itemIndex) => {
      const itemTokens = words(item.n);
      let score = 0;
      itemWords.forEach((word) => {
        if (overlaps(word, itemTokens)) score += 2;
        else if (overlaps(word, sectionTokens)) score += 1;
      });
      sectionWords.forEach((word) => {
        if (overlaps(word, sectionTokens)) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = { sectionIndex, itemIndex, label: item.n, section: section.name };
      }
    });
  });

  return bestScore >= 3 ? best : null;
}
```

## `src/lib/inspector/prompt.ts`

```tsx
export const BRAND = "CarBecho";

export const INSPECTION_SECTIONS = [
  "Exterior & Bodywork",
  "Lights",
  "Engine Compartment",
  "Undercarriage & Suspension",
  "Tyres & Brakes",
  "Interior & Electronics",
  "Documents & Service History",
] as const;

export type Severity = "Minor" | "Major" | "Critical";

/** Standard scope of a 200-point used-car evaluation, by section. */
const CHECKLIST_SCOPE = `
Exterior & Bodywork: door skins, rocker sills, body alignment, front fenders, body panels,
condition of paint, pillars, bumpers, signs of collision damage, factory painted bolts.
Lights: headlights, brake lights, hazard flashers, backup lights, tail lights, interior lights.
Engine Compartment: engine condition and odours, battery, radiator, coolant hoses, belts /
tensioners / pulleys, power steering fluid level and condition, engine oil and coolant levels,
firewall, body dust or overspray indicating past repair.
Undercarriage & Suspension: undercarriage, transfer case, axles, shocks, control arms, tie rods,
exhaust system, suspension components, transmission (checked visually and by running the gears).
Tyres & Brakes: even wear across all four tyres, tread depth, brake effectiveness and condition.
Interior & Electronics: upholstery tears, front seat recline and adjustment, seats and seat belts,
headliner and pillars, door panels, carpet and floor mats, trunk interior, trunk tools, trunk
floor, and every interior electrical function.
Documents & Service History: registration certificate, owner photo ID, service history records
in the owner's manual, current insurance. A full evaluation runs 45-60 minutes.
`;

export const INSPECTOR_SYSTEM_PROMPT = `
You are "${BRAND} Co-Pilot", an expert automotive evaluator assistant that rides along with a
${BRAND} field inspector doing a 200-point used-car inspection. The inspector is standing next to
the car, often with dirty hands, talking to you through a headset. You are answering by voice.

HOW YOU SPEAK
- Reply in natural, conversational Hinglish (Hindi + technical automotive English) by default.
  If the inspector speaks pure English, answer in pure English. Mirror their language.
- Maximum 2-3 short sentences in the spoken reply. No markdown, no bullet points, no symbols,
  no emoji, no numbered lists - it is going straight into a text-to-speech engine.
- Address the inspector as "Sir". Be direct and field-ready, never chatty.

WHEN THE INSPECTOR SENDS A PHOTO
- Say what you can actually see, in one clause, before your call: "Sir, photo me oil seepage
  dikh raha hai valve cover ke paas..."
- Judge only from what is visible. Never claim to see a part that is out of frame, out of focus,
  or too dark. If the photo does not settle it, say so and name the one extra angle or detail you
  need - closer shot, better light, engine running, panel from the side.
- A photo plus the inspector's words together decide the call. If they disagree, trust the photo
  for what is visible and the inspector for what is heard, felt, or smelled.

WHAT YOU DO
For every fault the inspector describes or photographs, work out:
1. section  - which inspection section it belongs to, from exactly this list:
   ${INSPECTION_SECTIONS.join(", ")}.
2. item     - the specific checklist line item (e.g. "Fuel leakage", "Tyre tread depth",
   "Shock absorber leakage"). Keep it under six words.
3. severity - Minor, Major, or Critical. Anything that is a safety hazard (fuel leak, brake
   failure, structural or pillar damage, steering play) is Critical.
4. action   - what the inspector should do right now in the app: what to mark, whether to
   photograph it, whether to flag it for a workshop estimate. One short line.
5. say      - the spoken reply, following the speaking rules above.

RULES
- Never invent a ${BRAND}-internal defect code, star rating formula, repair price, or policy.
  If the inspector asks for a number you cannot know, say the rating and cost must come from
  the app's own rules engine and tell them what to log instead.
- If the symptom is ambiguous, ask exactly one short diagnostic question in "say" and set
  severity to your best current guess.
- If the query is not about vehicle inspection, answer briefly and leave section empty.

INSPECTION SCOPE YOU ARE WORKING AGAINST
${CHECKLIST_SCOPE}
`.trim();

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    say: { type: "string", description: "The spoken reply. 2-3 short sentences, no formatting." },
    section: { type: "string", description: "Inspection section, or empty if not applicable." },
    item: { type: "string", description: "Specific checklist line item, under six words." },
    // No empty-string member: Gemini rejects an empty enum value outright.
    // severity is not in `required`, so the model can simply omit it.
    severity: { type: "string", enum: ["Minor", "Major", "Critical"] },
    action: { type: "string", description: "What to do in the app right now. One line." },
  },
  required: ["say"],
} as const;

export const STARTER_PROMPTS = [
  "Carburetor se petrol leak ho raha hai aur engine knock kar raha hai",
  "Front left tyre ka tread andar se ghisa hua hai, bahar se theek hai",
  "B-pillar pe paint thickness zyada aa rahi hai, repaint lagta hai",
  "Undercarriage pe rust hai axle ke paas, kitna serious hai",
  "AC cooling weak hai aur power window driver side slow hai",
  "Service history nahi hai owner ke paas, kya karun",
];

/** Used when the inspector sends a photo without saying anything. */
export const PHOTO_ONLY_PROMPT = "Is photo me kya issue dikh raha hai? Checklist me kya mark karun?";
```

## `src/lib/inspector/store.ts`

```tsx
import { createAdminClient } from "@/lib/supabase/admin";

export type StoredFinding = {
  id: string;
  created_at: string;
  question: string;
  say: string;
  section: string;
  item: string;
  severity: string;
  action: string;
  lang: string;
  thumb: string | null;
  has_photo: boolean;
};

export type NewFinding = Omit<StoredFinding, "id" | "created_at">;

/**
 * Writes go through the service role so the public anon key stays read-only -
 * the findings table has a select policy and no insert policy on purpose.
 * Returns false rather than throwing: failing to log a finding must never cost
 * the inspector their answer.
 */
export async function saveFinding(finding: NewFinding): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[inspector] SUPABASE_SERVICE_ROLE_KEY missing - finding not saved");
    return false;
  }

  try {
    const { error } = await createAdminClient().from("inspection_findings").insert(finding);
    if (error) {
      console.error("[inspector] save failed", error.message);
      return false;
    }
    return true;
  } catch (caught) {
    console.error("[inspector] save threw", caught);
    return false;
  }
}
```

## `src/lib/rate-limit.ts`

```tsx
// In-memory sliding-window rate limiter, keyed by client IP. Good enough to
// blunt casual abuse/scripted hammering of unauthenticated routes; it resets
// per server instance so it isn't a substitute for a shared store like Redis
// under multi-instance deployment, but there is currently only one instance.
const buckets = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function isRateLimited(request: Request, key: string, limit: number, windowMs: number): boolean {
  const bucketKey = `${key}:${clientIp(request)}`;
  const now = Date.now();
  const hits = (buckets.get(bucketKey) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(bucketKey, hits);
    return true;
  }

  hits.push(now);
  buckets.set(bucketKey, hits);
  return false;
}
```

## `src/lib/supabase/admin.ts`

```tsx
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Uses the service-role key to bypass RLS for admin writes and
// the registered-user count. Never import this from a Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

## `src/lib/supabase/public.ts`

```tsx
import { createClient } from "@supabase/supabase-js";

// A cookie-free Supabase client for reading data that's already publicly
// readable (shots, news). Unlike the server client in ./server.ts, this
// never touches request cookies, so pages using it can stay statically
// cached/ISR'd instead of being forced into per-request dynamic rendering.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## `schema.sql`
```sql
-- Supabase table used by CarBecho's findings log.
-- Inferred from src/lib/inspector/store.ts (the repo has no migration file for it).
create table if not exists public.inspection_findings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  question    text not null,
  say         text not null,
  section     text not null,
  item        text not null,
  severity    text not null,
  action      text not null,
  lang        text not null,
  thumb       text,
  has_photo   boolean not null default false
);

alter table public.inspection_findings enable row level security;

-- Anyone can read; writes happen only via the service-role key (no insert policy on purpose).
create policy "findings are publicly readable"
  on public.inspection_findings for select using (true);
```
