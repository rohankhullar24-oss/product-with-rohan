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

type Mark = {
  v: "pass" | "fail" | "na";
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
                                ✦ Suggests <b>{item.ai.v.toUpperCase()}</b> — {item.ai.src}
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
                            {(["pass", "fail", "na"] as const).map((verdict) => (
                              <button
                                key={verdict}
                                onClick={() => setItem(sectionIndex, itemIndex, verdict, { byAi: false, byChat: false })}
                                style={{
                                  flex: 1,
                                  padding: "7px 0",
                                  borderRadius: 10,
                                  fontSize: 11.5,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  border: `1.5px solid ${mark.v === verdict ? "transparent" : C.line}`,
                                  background:
                                    mark.v === verdict
                                      ? verdict === "pass"
                                        ? C.pass
                                        : verdict === "fail"
                                          ? C.fail
                                          : C.na
                                      : "#fff",
                                  color: mark.v === verdict ? "#fff" : C.sub,
                                }}
                              >
                                {verdict === "pass" ? "✓ Pass" : verdict === "fail" ? "✕ Fail" : "N/A"}
                              </button>
                            ))}
                          </div>

                          {mark.v === "fail" && (
                            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <Pill bg={C.failBg} color={C.fail}>📷 Photo required</Pill>
                              <Pill bg={C.amberBg} color={C.amber}>{mark.sev || "Minor"} severity</Pill>
                              {mark.byAi && <Pill bg={C.aiBg} color={C.ai}>✦ AI-detected</Pill>}
                              {mark.byChat && <Pill bg={C.aiBg} color={C.ai}>💬 via chat</Pill>}
                            </div>
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
