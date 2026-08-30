"use client";

import { useState } from "react";
import {
  ShieldCheck, Camera, Check, ChevronRight, Loader2, X,
  Smartphone, Store, Building2, AlertTriangle, RotateCcw,
  Fingerprint, Lock, Scan, Pencil, MapPin, Eye, EyeOff,
  type LucideIcon,
} from "lucide-react";

/* ─────────────────────────  design tokens  ───────────────────────── */
const T = {
  room: "#E9E5DE", surface: "#FFFFFF", raised: "#FBFAF8",
  ink: "#15151A", muted: "#74747E", faint: "#9A9AA2",
  line: "#ECE9E3", lineSoft: "#F3F1EC",
  primary: "#BE123C", primaryInk: "#9F1239", primaryTint: "#FDF1F4",
  green: "#15803D", greenTint: "#ECFDF3", greenLine: "#A7E8BF",
  amber: "#B45309", amberTint: "#FFFBEB", amberLine: "#FCE3A8", blue: "#1D4ED8",
};
const FONT = `'Inter', -apple-system, system-ui, sans-serif`;
const DISP = `'Plus Jakarta Sans', ${FONT}`;
const MONO = `'JetBrains Mono', ui-monospace, monospace`;

const RECORD = {
  name: "Rakesh Kumar Yadav",
  merchantId: "MER-4471902",
  aadhaarFull: "5234 8891 4321",
  panOnFile: "BXYPK7821Q",
  mobile: "+91 9XXXX X4821",
  dueBy: "14 Jun 2025",
};

const STEPS = ["Verify", "Shop", "Done"];

type Method = "face" | "biometric" | null;
type Ckyc = "verified" | "skipped" | null;
type Photos = { out: boolean; in: boolean };
type Mcc = { code: string; label: string; confidence: number };

export default function RekycFunnel() {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [pan, setPan] = useState(RECORD.panOnFile);
  const [aadhaar, setAadhaar] = useState(RECORD.aadhaarFull);
  const [method, setMethod] = useState<Method>(null);
  const [ckyc, setCkyc] = useState<Ckyc>(null);
  const [photos, setPhotos] = useState<Photos>({ out: false, in: false });
  const [mcc, setMcc] = useState<Mcc>({ code: "5411", label: "Grocery Stores / Supermarkets", confidence: 92 });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const reset = () => {
    setConsent(false); setPan(RECORD.panOnFile); setAadhaar(RECORD.aadhaarFull); setMethod(null); setCkyc(null);
    setPhotos({ out: false, in: false });
    setMcc({ code: "5411", label: "Grocery Stores / Supermarkets", confidence: 92 });
    setStep(0);
  };

  const shared = {
    next, reset, consent, setConsent, pan, setPan, aadhaar, setAadhaar, method, setMethod,
    setCkyc, photos, setPhotos, mcc, setMcc,
  };

  return (
    <div style={{ minHeight: "100vh", background: T.room, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 12px", fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .rekyc * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        @keyframes rekyc-ring { to { transform: rotate(360deg) } }
        @keyframes rekyc-scan { 0%{transform:translateY(-42px)} 50%{transform:translateY(42px)} 100%{transform:translateY(-42px)} }
        @keyframes rekyc-pulse { 0%,100%{opacity:.4;transform:scale(.94)} 50%{opacity:1;transform:scale(1)} }
        @keyframes rekyc-pop { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes rekyc-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rekyc-flash { 0%{opacity:0} 40%{opacity:.85} 100%{opacity:0} }
        .rekyc-scr { animation: rekyc-fade .28s ease both; }
        .rekyc-tap { transition: transform .12s ease, background .15s ease, border-color .15s ease; cursor: pointer; }
        .rekyc-tap:active { transform: scale(.985); }
        .rekyc ::-webkit-scrollbar { width: 0 }
        @media (prefers-reduced-motion: reduce){ .rekyc *{animation:none!important} }
      `}</style>

      <div className="rekyc">
        <Phone step={step}>
          <div className="rekyc-scr" key={step} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {step === 0 && <Verify {...shared} />}
            {step === 1 && <ShopDetails {...shared} />}
            {step === 2 && <Done reset={reset} />}
          </div>
        </Phone>
      </div>
    </div>
  );
}

/* ─────────────────────────  phone shell  ───────────────────────── */
function Phone({ children, step }: { children: React.ReactNode; step: number }) {
  const showBar = step < 2;
  return (
    <div style={{
      width: 392, maxWidth: "92vw", height: 800, maxHeight: "88vh", background: T.surface, borderRadius: 44,
      boxShadow: "0 2px 4px rgba(0,0,0,.06), 0 30px 70px -20px rgba(20,20,30,.45), inset 0 0 0 9px #111318, inset 0 0 0 11px #2A2D34",
      position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)", width: 128, height: 30, background: "#111318", borderRadius: 16, zIndex: 40 }} />
      <div style={{ padding: "16px 30px 6px", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: T.ink, zIndex: 30 }}>
        <span style={{ fontFamily: MONO }}>9:41</span>
        <span style={{ fontFamily: MONO, color: T.muted }}>5G ▪ 84%</span>
      </div>

      <div style={{ padding: "6px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: T.primary, display: "grid", placeItems: "center", boxShadow: `0 4px 10px -3px ${T.primary}` }}>
            <ShieldCheck size={15} color="#fff" strokeWidth={2.4} />
          </div>
          <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 14, letterSpacing: -0.2, color: T.ink }}>Merchant KYC Portal</div>
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: T.muted, fontFamily: MONO, textTransform: "uppercase" }}>Merchant Re-KYC</span>
        </div>
        {showBar && (
          <div style={{ marginTop: 14, display: "flex", gap: 5 }}>
            {STEPS.slice(0, 2).map((_, i) => {
              const active = step >= i;
              return <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: active ? T.primary : T.line, transition: "background .3s" }} />;
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", marginTop: showBar ? 10 : 4 }}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────  shared UI  ───────────────────────── */
const Body = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px 14px", ...style }}>{children}</div>
);
const Foot = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: "12px 22px 26px", borderTop: `1px solid ${T.lineSoft}`, background: T.surface }}>{children}</div>
);
const H1 = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 23, lineHeight: 1.18, letterSpacing: -0.5, color: T.ink }}>{children}</div>
    {sub && <div style={{ marginTop: 7, fontSize: 13.5, lineHeight: 1.5, color: T.muted }}>{sub}</div>}
  </div>
);
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.primary, marginBottom: 10 }}>{children}</div>
);

function Btn({ children, onClick, disabled, kind = "ink", icon }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; kind?: "ink" | "accent"; icon?: React.ReactNode;
}) {
  const base: React.CSSProperties = { width: "100%", border: "none", borderRadius: 15, padding: "16px 18px", fontFamily: DISP, fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" };
  const styles: Record<string, React.CSSProperties> = {
    accent: { ...base, background: disabled ? "#E4E1DB" : T.primary, color: disabled ? T.faint : "#fff", boxShadow: disabled ? "none" : `0 12px 24px -10px ${T.primary}` },
    ink: { ...base, background: disabled ? "#E4E1DB" : T.ink, color: disabled ? T.faint : "#fff", boxShadow: disabled ? "none" : "0 10px 22px -10px rgba(20,20,30,.6)" },
  };
  return (
    <button className="rekyc-tap" onClick={disabled ? undefined : onClick} disabled={disabled} style={styles[kind]}>
      {icon}{children}{kind === "accent" && !icon && <ChevronRight size={18} />}
    </button>
  );
}

function Pill({ tone = "muted", children }: { tone?: "green" | "amber" | "muted" | "primary" | "blue"; children: React.ReactNode }) {
  const map = {
    green: { bg: T.greenTint, fg: T.green, bd: T.greenLine },
    amber: { bg: T.amberTint, fg: T.amber, bd: T.amberLine },
    muted: { bg: T.lineSoft, fg: T.muted, bd: T.line },
    primary: { bg: T.primaryTint, fg: T.primaryInk, bd: "#F6C9D4" },
    blue: { bg: "#EEF2FF", fg: T.blue, bd: "#CBD6FF" },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999, background: map.bg, color: map.fg, border: `1px solid ${map.bd}`, letterSpacing: 0.2 }}>{children}</span>
  );
}

const Card = ({ children, style, onClick, className }: {
  children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; className?: string;
}) => (
  <div onClick={onClick} className={className} style={{ background: T.raised, border: `1px solid ${T.line}`, borderRadius: 18, padding: 16, ...style }}>{children}</div>
);

const Label = ({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
    <span style={{ fontSize: 11.5, color: T.muted, fontWeight: 600 }}>{children}</span>
    {hint}
  </div>
);

const inputStyle = (editable = true): React.CSSProperties => ({
  width: "100%", padding: "13px 14px", borderRadius: 12,
  border: `1px solid ${T.line}`, fontFamily: FONT, fontSize: 14, outline: "none",
  color: editable ? T.ink : T.muted, background: editable ? T.surface : T.lineSoft,
});

function useVerify(): [string, (cb?: () => void, ms?: number) => void] {
  const [state, setState] = useState("idle");
  const run = (cb?: () => void, ms = 1500) => { setState("loading"); setTimeout(() => { setState("done"); cb && cb(); }, ms); };
  return [state, run];
}

const maskAadhaar = (v: string) => { const d = (v || "").replace(/\D/g, ""); return ("XXXX XXXX " + d.slice(-4)).trim(); };
const fmtAadhaar = (v: string) => (v || "").replace(/\D/g, "").slice(0, 12).replace(/(.{4})(?=.)/g, "$1 ");
const maskPan = (v: string) => { v = v || ""; return v.length <= 4 ? v : "X".repeat(v.length - 4) + v.slice(-4); };

function SecureField({ label, hint, value, displayValue, onChange, show, onToggle, valid, placeholder }: {
  label: string; hint?: React.ReactNode; value: string; displayValue: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; valid: boolean; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label hint={hint}>{label}</Label>
      <div style={{ position: "relative" }}>
        <input value={show ? value : displayValue} readOnly={!show} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ ...inputStyle(true), fontFamily: MONO, fontSize: 16, fontWeight: 700, letterSpacing: 2, padding: "14px 46px 14px 16px", borderColor: valid ? T.green : T.line }} />
        <button type="button" onClick={onToggle} aria-label={show ? "Hide" : "Show"}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: 9, border: "none", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
          {show ? <EyeOff size={18} color={T.muted} /> : <Eye size={18} color={T.muted} />}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── 0 · VERIFY (Aadhaar KUA + PAN together) ───────────────────────── */
function Verify({ next, consent, setConsent, pan, setPan, aadhaar, setAadhaar, setMethod, setCkyc }: {
  next: () => void; consent: boolean; setConsent: (v: boolean) => void; pan: string; setPan: (v: string) => void;
  aadhaar: string; setAadhaar: (v: string) => void; setMethod: (m: Method) => void; setCkyc: (c: Ckyc) => void;
}) {
  const [mode, setMode] = useState<"ckyc" | "aadhaar">("ckyc");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [ckycState, ckycRun] = useVerify();
  const [busy, setBusy] = useState<Method>(null);
  const [scanning, setScanning] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  const aadhaarValid = aadhaar.replace(/\D/g, "").length === 12;
  const ready = consent && panValid && aadhaarValid;

  const finish = (ckycVal: Ckyc, methodVal: Method) => { setCkyc(ckycVal); if (methodVal) setMethod(methodVal); next(); };
  const verifyCkyc = () => ckycRun(() => finish("verified", null));
  const authenticate = (m: "face" | "biometric") => {
    setMethod(m); setBusy(m); setScanning(true);
    setTimeout(() => finish("skipped", m), m === "face" ? 2500 : 2000);
  };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
      <Body>
        <Eyebrow>Periodic re-verification</Eyebrow>
        <H1 sub="Verify with your CKYC OTP. If you don't have it, authenticate with Aadhaar instead.">Re-verify your business</H1>

        <Card style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: T.primaryTint, display: "grid", placeItems: "center", flexShrink: 0 }}><Store size={19} color={T.primary} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14.5, color: T.ink }}>{RECORD.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: T.muted }}>{RECORD.merchantId}</div>
          </div>
          <Pill tone="amber"><AlertTriangle size={11} /> Due {RECORD.dueBy.slice(0, 6)}</Pill>
        </Card>

        <SecureField
          label="Aadhaar number"
          hint={<span style={{ fontSize: 10.5, color: T.faint, fontFamily: MONO }}>ON FILE</span>}
          value={aadhaar}
          displayValue={maskAadhaar(aadhaar)}
          onChange={(v) => setAadhaar(fmtAadhaar(v))}
          show={showAadhaar}
          onToggle={() => setShowAadhaar((s) => !s)}
          valid={aadhaarValid}
          placeholder="XXXX XXXX XXXX"
        />

        <SecureField
          label="PAN number"
          hint={<span style={{ fontSize: 10.5, color: T.faint, fontFamily: MONO }}>{RECORD.panOnFile ? "ON FILE" : "REQUIRED"}</span>}
          value={pan}
          displayValue={maskPan(pan)}
          onChange={(v) => setPan(v.toUpperCase().slice(0, 10))}
          show={showPan}
          onToggle={() => setShowPan((s) => !s)}
          valid={panValid}
          placeholder="ABCDE1234F"
        />
        <div style={{ fontSize: 11, color: T.faint, marginTop: 2, marginBottom: 18 }}>Pre-filled from your record — tap the eye to view, edit if anything has changed. PAN is verified with NSDL.</div>

        <Card onClick={() => setConsent(!consent)} className="rekyc-tap" style={{ display: "flex", gap: 12, alignItems: "flex-start", borderColor: consent ? T.primary : T.line, background: consent ? T.primaryTint : T.raised, marginBottom: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${consent ? T.primary : "#CFCCC5"}`, background: consent ? T.primary : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
            {consent && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: T.ink }}>I authorise the bank to authenticate my identity and verify my PAN to update my KYC records.</span>
        </Card>

        <Label>{mode === "ckyc" ? "Verify with CKYC OTP" : "Authenticate with Aadhaar"}</Label>

        {mode === "ckyc" ? (
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "#EEF2FF", display: "grid", placeItems: "center", flexShrink: 0 }}><Smartphone size={18} color={T.blue} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: T.ink }}>CKYC OTP</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>OTP to {RECORD.mobile}</div>
              </div>
            </div>
            {!otpSent ? (
              <Btn kind="ink" disabled={!ready} onClick={() => setOtpSent(true)} icon={<Smartphone size={16} />}>Send CKYC OTP</Btn>
            ) : (
              <>
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter OTP" inputMode="numeric"
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 13, border: `1px solid ${T.line}`, fontFamily: MONO, fontSize: 17, letterSpacing: 5, outline: "none", marginBottom: 12, textAlign: "center" }} />
                <Btn kind="ink" disabled={otp.length < 6 || ckycState === "loading"} onClick={verifyCkyc}
                  icon={ckycState === "loading" ? <Loader2 size={18} style={{ animation: "rekyc-ring 1s linear infinite" }} /> : <Lock size={16} />}>
                  {ckycState === "loading" ? "Verifying…" : "Verify & continue"}
                </Btn>
              </>
            )}
            {otpSent && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 6px" }}>
                  <div style={{ flex: 1, height: 1, background: T.line }} />
                  <span style={{ fontSize: 10.5, color: T.faint, fontFamily: MONO }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: T.line }} />
                </div>
                <button className="rekyc-tap" onClick={() => setMode("aadhaar")} style={{ width: "100%", background: "transparent", border: "none", color: T.primary, fontFamily: DISP, fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: "6px" }}>
                  Don&apos;t have CKYC OTP? Authenticate with Aadhaar
                </button>
              </>
            )}
          </Card>
        ) : !scanning ? (
          <>
            <div style={{ display: "flex", gap: 10 }}>
              <AuthOption icon={Scan} label="Face Auth" sub="UIDAI Face RD" disabled={!ready} onClick={() => authenticate("face")} />
              <AuthOption icon={Fingerprint} label="Biometric" sub="Fingerprint" disabled={!ready} onClick={() => authenticate("biometric")} />
            </div>
            <button className="rekyc-tap" onClick={() => setMode("ckyc")} style={{ width: "100%", marginTop: 12, background: "transparent", border: "none", color: T.primary, fontFamily: DISP, fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: "6px" }}>
              Use CKYC OTP instead
            </button>
          </>
        ) : (
          <Card style={{ display: "grid", placeItems: "center", padding: "22px 0 18px" }}>
            {busy === "face" ? (
              <div style={{ position: "relative", width: 110, height: 110, borderRadius: "50%", background: T.primaryTint, display: "grid", placeItems: "center", overflow: "hidden", border: `1px solid ${T.line}` }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: T.primary, animation: "rekyc-ring .9s linear infinite" }} />
                <Scan size={48} color={T.primary} strokeWidth={1.4} />
                <div style={{ position: "absolute", left: 12, right: 12, height: 2, background: T.primary, boxShadow: `0 0 10px ${T.primary}`, animation: "rekyc-scan 1.4s ease-in-out infinite" }} />
              </div>
            ) : (
              <div style={{ width: 110, height: 110, borderRadius: "50%", background: T.primaryTint, display: "grid", placeItems: "center", border: `1px solid ${T.line}` }}>
                <Fingerprint size={54} color={T.primary} style={{ animation: "rekyc-pulse 1.1s ease-in-out infinite" }} />
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
              {busy === "face" ? "Hold still — verifying identity & PAN…" : "Place your finger on the device…"}
            </div>
          </Card>
        )}

        {!ready && <div style={{ fontSize: 11, color: T.amber, marginTop: 10 }}>Enter a valid PAN and accept the authorisation to continue.</div>}
      </Body>
    </div>
  );
}

function AuthOption({ icon: Ic, label, sub, onClick, disabled }: {
  icon: LucideIcon; label: string; sub: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div onClick={disabled ? undefined : onClick} className={disabled ? "" : "rekyc-tap"}
      style={{ flex: 1, border: `1px solid ${disabled ? T.line : T.primary}`, borderRadius: 14, padding: "16px 10px", textAlign: "center", background: disabled ? T.lineSoft : T.surface, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      <Ic size={26} color={disabled ? T.faint : T.primary} style={{ margin: "0 auto" }} />
      <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: T.ink, marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: T.muted, fontFamily: MONO }}>{sub}</div>
    </div>
  );
}

/* ───────────────────────── 1 · SHOP (photos + address + MCC, merged) ───────────────────────── */
const MCC_OPTIONS = [
  { code: "5411", label: "Grocery Stores / Supermarkets" },
  { code: "5499", label: "Misc. Food Stores / Convenience" },
  { code: "5311", label: "Department Stores" },
  { code: "5814", label: "Fast Food / Eateries" },
  { code: "5912", label: "Pharmacy / Drug Stores" },
];

function ShopDetails({ next, photos, setPhotos, mcc, setMcc, method, setMethod }: {
  next: () => void; photos: Photos; setPhotos: React.Dispatch<React.SetStateAction<Photos>>;
  mcc: Mcc; setMcc: (m: Mcc) => void; method: Method; setMethod: (m: Method) => void;
}) {
  const [cam, setCam] = useState<"out" | "in" | null>(null);
  const [flash, setFlash] = useState(false);
  const [shopName, setShopName] = useState("Yadav General Store");
  const [fatherName, setFatherName] = useState("");
  const [line1, setLine1] = useState("Shop 12");
  const line2 = "Sector 14 Main Market";
  const geo = { pincode: "122001", city: "Gurugram", district: "Gurugram", state: "Haryana" };
  const [state, run] = useVerify();
  const [showMcc, setShowMcc] = useState(false);
  const [editing, setEditing] = useState(false);
  const [atLocation, setAtLocation] = useState(false);
  const [consent, setConsent] = useState(false);

  const bothPhotos = photos.out && photos.in;
  const canVerify = bothPhotos && atLocation && shopName.trim().length > 1 && fatherName.trim().length > 1 && line1.trim().length > 1;

  const needsAadhaar = !method;
  const [busy, setBusy] = useState<Method>(null);
  const [stage, setStage] = useState<"form" | "scan" | "verifying" | "success">("form");
  const finishSeq = () => {
    setStage("verifying");
    setTimeout(() => setStage("success"), 1400);
    setTimeout(() => next(), 2600);
  };
  const authenticate = (m: "face" | "biometric") => {
    setBusy(m); setStage("scan");
    setTimeout(() => { setMethod(m); finishSeq(); }, m === "face" ? 2500 : 2000);
  };

  const capture = () => {
    setFlash(true);
    setTimeout(() => { setFlash(false); setPhotos((p) => ({ ...p, [cam as "out" | "in"]: true })); setCam(null); }, 260);
  };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
      <Body>
        <Eyebrow>Step 2 · Shop &amp; details</Eyebrow>
        <H1 sub="Confirm your shop details, then capture live photos of your shop.">Your shop</H1>

        <Label hint={<span style={{ fontSize: 10, color: T.faint, fontFamily: MONO }}>PREFILLED · EDITABLE</span>}>Shop name</Label>
        <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Yadav General Store" style={{ ...inputStyle(true), marginBottom: 14 }} />

        <Label>Father&apos;s name</Label>
        <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} placeholder="e.g. Suresh Kumar Yadav" style={{ ...inputStyle(true), marginBottom: 14 }} />

        <Label hint={<span style={{ fontSize: 10, color: T.faint, fontFamily: MONO, display: "inline-flex", alignItems: "center", gap: 4 }}><Pencil size={10} /> EDITABLE</span>}>Address line 1</Label>
        <input value={line1} onChange={(e) => setLine1(e.target.value)} style={{ ...inputStyle(true), marginBottom: 14 }} />

        <Label hint={<span style={{ fontSize: 10, color: T.blue, fontFamily: MONO, display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={10} /> FROM GOOGLE</span>}>Address line 2</Label>
        <input value={line2} readOnly style={{ ...inputStyle(false), marginBottom: 14 }} />

        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <Label>Pincode</Label>
            <input value={geo.pincode} readOnly style={{ ...inputStyle(false), fontFamily: MONO }} />
          </div>
          <div style={{ flex: 1 }}>
            <Label>City</Label>
            <input value={geo.city} readOnly style={inputStyle(false)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <Label>District</Label>
            <input value={geo.district} readOnly style={inputStyle(false)} />
          </div>
          <div style={{ flex: 1 }}>
            <Label>State</Label>
            <input value={geo.state} readOnly style={inputStyle(false)} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 18, display: "flex", alignItems: "center", gap: 5 }}>
          <Lock size={11} /> Pincode, city, district and state auto-fetched from your location.
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.faint, letterSpacing: 0.4, marginBottom: 8, fontFamily: MONO }}>SHOP PHOTOS · CAMERA ONLY</div>
        <PhotoTile icon={Building2} label="Storefront (outside)" hint="Tap to open camera" done={photos.out} onShoot={() => setCam("out")} />
        <div style={{ height: 10 }} />
        <PhotoTile icon={Store} label="Inside the shop" hint="Tap to open camera" done={photos.in} onShoot={() => setCam("in")} />

        <div style={{ height: 16 }} />
        <Card onClick={() => setAtLocation(!atLocation)} className="rekyc-tap" style={{ display: "flex", gap: 12, alignItems: "center", borderColor: atLocation ? T.primary : T.line, background: atLocation ? T.primaryTint : T.raised, marginBottom: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${atLocation ? T.primary : "#CFCCC5"}`, background: atLocation ? T.primary : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
            {atLocation && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} color={T.primary} /> I am currently at my shop location.</span>
        </Card>

        {showMcc && (
          <div className="rekyc-scr" style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.faint, letterSpacing: 0.4, marginBottom: 8, fontFamily: MONO }}>BUSINESS CATEGORY · FROM SHOP PHOTOS</div>
            <Card style={{ background: T.primaryTint, borderColor: "#F6C9D4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11, color: T.primaryInk, letterSpacing: 1 }}>MCC {mcc.code}</div>
                  <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 17, color: T.ink, marginTop: 3, lineHeight: 1.25 }}>{mcc.label}</div>
                </div>
                <Pill tone="primary">{mcc.confidence}% conf.</Pill>
              </div>
              <div style={{ marginTop: 12, height: 6, borderRadius: 6, background: "#F6C9D4", overflow: "hidden" }}>
                <div style={{ width: `${mcc.confidence}%`, height: "100%", background: T.primary, borderRadius: 6 }} />
              </div>
            </Card>
            {!editing ? (
              <button className="rekyc-tap" onClick={() => setEditing(true)} style={{ width: "100%", marginTop: 10, background: "transparent", border: `1px solid ${T.line}`, borderRadius: 13, padding: "11px", fontFamily: DISP, fontWeight: 600, fontSize: 12.5, color: T.ink, cursor: "pointer" }}>Change category</button>
            ) : (
              <div style={{ marginTop: 10 }}>
                {MCC_OPTIONS.map((o) => {
                  const sel = o.code === mcc.code;
                  return (
                    <div key={o.code} className="rekyc-tap" onClick={() => { setMcc({ ...o, confidence: o.code === "5411" ? 92 : 100 }); setEditing(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 12, border: `1px solid ${sel ? T.primary : T.line}`, background: sel ? T.primaryTint : T.surface, marginBottom: 7, cursor: "pointer" }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: T.muted, width: 36 }}>{o.code}</span>
                      <span style={{ fontSize: 13, color: T.ink, flex: 1 }}>{o.label}</span>
                      {sel && <Check size={15} color={T.primary} strokeWidth={3} />}
                    </div>
                  );
                })}
              </div>
            )}

            <Card onClick={() => setConsent(!consent)} className="rekyc-tap" style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "flex-start", borderColor: consent ? T.primary : T.line, background: consent ? T.primaryTint : T.raised }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${consent ? T.primary : "#CFCCC5"}`, background: consent ? T.primary : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                {consent && <Check size={14} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: T.ink }}>I confirm these shop details and business category are correct, and submit them to complete my re-KYC.</span>
            </Card>

            {needsAadhaar && (stage === "form" || stage === "scan") && (
              <div style={{ marginTop: 16 }}>
                <Label>Authenticate with Aadhaar to complete</Label>
                {stage === "form" ? (
                  <>
                    <div style={{ display: "flex", gap: 10 }}>
                      <AuthOption icon={Scan} label="Face Auth" sub="UIDAI Face RD" disabled={!consent} onClick={() => authenticate("face")} />
                      <AuthOption icon={Fingerprint} label="Biometric" sub="Fingerprint" disabled={!consent} onClick={() => authenticate("biometric")} />
                    </div>
                    {!consent && <div style={{ fontSize: 11, color: T.amber, marginTop: 9 }}>Tick the confirmation above, then authenticate to finish.</div>}
                  </>
                ) : (
                  <Card style={{ display: "grid", placeItems: "center", padding: "22px 0 18px" }}>
                    {busy === "face" ? (
                      <div style={{ position: "relative", width: 110, height: 110, borderRadius: "50%", background: T.primaryTint, display: "grid", placeItems: "center", overflow: "hidden", border: `1px solid ${T.line}` }}>
                        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: T.primary, animation: "rekyc-ring .9s linear infinite" }} />
                        <Scan size={48} color={T.primary} strokeWidth={1.4} />
                        <div style={{ position: "absolute", left: 12, right: 12, height: 2, background: T.primary, boxShadow: `0 0 10px ${T.primary}`, animation: "rekyc-scan 1.4s ease-in-out infinite" }} />
                      </div>
                    ) : (
                      <div style={{ width: 110, height: 110, borderRadius: "50%", background: T.primaryTint, display: "grid", placeItems: "center", border: `1px solid ${T.line}` }}>
                        <Fingerprint size={54} color={T.primary} style={{ animation: "rekyc-pulse 1.1s ease-in-out infinite" }} />
                      </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
                      {busy === "face" ? "Hold still — authenticating…" : "Place your finger on the device…"}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </Body>

      <Foot>
        {!showMcc ? (
          <Btn kind="ink" disabled={!canVerify || state === "loading"} onClick={() => run(() => setShowMcc(true), 1500)}
            icon={state === "loading" ? <Loader2 size={18} style={{ animation: "rekyc-ring 1s linear infinite" }} /> : <Check size={17} />}>
            {state === "loading" ? "Verifying address…" : "Verify"}
          </Btn>
        ) : stage === "verifying" ? (
          <Btn kind="ink" disabled icon={<Loader2 size={18} style={{ animation: "rekyc-ring 1s linear infinite" }} />}>Verifying re-KYC…</Btn>
        ) : stage === "success" ? (
          <Btn kind="accent" disabled icon={<Check size={18} strokeWidth={3} />}>Re-KYC successful</Btn>
        ) : needsAadhaar ? (
          <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "4px" }}>
            {stage === "scan" ? "Authenticating…" : (consent ? "Authenticate with Aadhaar above to finish." : "Tick the confirmation to continue.")}
          </div>
        ) : (
          <Btn kind="accent" disabled={!consent} onClick={finishSeq}>Submit re-KYC</Btn>
        )}
      </Foot>

      {cam && (
        <div style={{ position: "absolute", inset: 0, background: "#0D0E11", zIndex: 50, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#fff", fontFamily: DISP, fontWeight: 700, fontSize: 14 }}>{cam === "out" ? "Storefront" : "Inside shop"}</span>
            <button className="rekyc-tap" onClick={() => setCam(null)} style={{ background: "rgba(255,255,255,.14)", border: "none", borderRadius: 999, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer" }}><X size={17} color="#fff" /></button>
          </div>

          <div style={{ flex: 1, position: "relative", margin: "0 20px", borderRadius: 16, overflow: "hidden", background: "linear-gradient(150deg,#3a3f47,#23262b 60%,#15171b)" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "46%", background: "linear-gradient(180deg,transparent,rgba(190,18,60,.18))" }} />
            {cam === "out"
              ? <Building2 size={86} color="rgba(255,255,255,.16)" style={{ position: "absolute", top: "34%", left: "50%", transform: "translate(-50%,-50%)" }} />
              : <Store size={86} color="rgba(255,255,255,.16)" style={{ position: "absolute", top: "34%", left: "50%", transform: "translate(-50%,-50%)" }} />}
            {[
              { top: 12, left: 12, borderWidth: "3px 0 0 3px" },
              { top: 12, right: 12, borderWidth: "3px 3px 0 0" },
              { bottom: 12, left: 12, borderWidth: "0 0 3px 3px" },
              { bottom: 12, right: 12, borderWidth: "0 3px 3px 0" },
            ].map((b, i) => (
              <div key={i} style={{ position: "absolute", ...b, width: 26, height: 26, borderStyle: "solid", borderColor: "rgba(255,255,255,.85)", borderRadius: 3 }} />
            ))}
            <div style={{ position: "absolute", top: 18, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,.7)", fontSize: 11.5, fontFamily: MONO }}>
              {cam === "out" ? "Fit the signboard in frame" : "Show the counter & interior"}
            </div>
            {flash && <div style={{ position: "absolute", inset: 0, background: "#fff", animation: "rekyc-flash .26s ease both" }} />}
          </div>

          <div style={{ padding: "22px 0 30px", display: "grid", placeItems: "center" }}>
            <button className="rekyc-tap" onClick={capture} aria-label="Capture" style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", border: "5px solid rgba(255,255,255,.4)", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.primary, display: "grid", placeItems: "center" }}><Camera size={22} color="#fff" /></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoTile({ icon: Ic, label, hint, done, onShoot }: {
  icon: LucideIcon; label: string; hint: string; done: boolean; onShoot: () => void;
}) {
  return (
    <div onClick={done ? undefined : onShoot} className={done ? "" : "rekyc-tap"}
      style={{ borderRadius: 18, border: `1px ${done ? "solid" : "dashed"} ${done ? T.greenLine : "#D5D2CB"}`, background: done ? T.greenTint : T.raised, padding: 14, display: "flex", alignItems: "center", gap: 14, cursor: done ? "default" : "pointer" }}>
      <div style={{ width: 60, height: 60, borderRadius: 13, overflow: "hidden", display: "grid", placeItems: "center", background: done ? "linear-gradient(150deg,#3a3f47,#1b1d22)" : T.lineSoft, position: "relative" }}>
        {done
          ? <><Ic size={26} color="rgba(255,255,255,.5)" /><div style={{ position: "absolute", right: 4, bottom: 4, width: 20, height: 20, borderRadius: "50%", background: T.green, display: "grid", placeItems: "center", animation: "rekyc-pop .4s ease both" }}><Check size={12} color="#fff" strokeWidth={3.5} /></div></>
          : <Ic size={24} color={T.muted} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14.5, color: T.ink }}>{label}</div>
        <div style={{ fontSize: 12, color: done ? T.green : T.muted, fontWeight: done ? 600 : 400 }}>{done ? "Captured" : hint}</div>
      </div>
      {done
        ? <button className="rekyc-tap" onClick={onShoot} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><RotateCcw size={17} color={T.muted} /></button>
        : <div style={{ width: 38, height: 38, borderRadius: 11, background: T.primary, display: "grid", placeItems: "center" }}><Camera size={18} color="#fff" /></div>}
    </div>
  );
}

/* ───────────────────────── 2 · DONE ───────────────────────── */
function Done({ reset }: { reset: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 30px", textAlign: "center" }}>
      <div style={{ width: 92, height: 92, borderRadius: "50%", background: T.greenTint, border: `1px solid ${T.greenLine}`, display: "grid", placeItems: "center", animation: "rekyc-pop .5s ease both" }}>
        <Check size={46} color={T.green} strokeWidth={3} />
      </div>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 24, color: T.ink, marginTop: 22, letterSpacing: -0.5 }}>Re-verification complete</div>
      <div style={{ fontSize: 13.5, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>Your KYC record has been updated. You&apos;ll get a confirmation on {RECORD.mobile}.</div>

      <Card style={{ width: "100%", marginTop: 22, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>Reference ID</span>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: T.ink }}>RKYC-2026-0061847</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.lineSoft}` }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>Merchant</span>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: T.ink }}>{RECORD.merchantId}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>Next re-KYC due</span>
          <Pill tone="green">14 Jun 2027</Pill>
        </div>
      </Card>

      <button className="rekyc-tap" onClick={reset} style={{ marginTop: 22, background: "transparent", border: "none", color: T.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <RotateCcw size={14} /> Restart demo
      </button>
    </div>
  );
}
