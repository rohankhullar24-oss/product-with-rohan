"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Mode = { m: number; n: number; f: number };

// A square plate rings at frequencies set by two whole numbers — how many
// half-waves fit across it each way. f ∝ (m² + n²).
const MODES: Mode[] = (() => {
  const out: Mode[] = [];
  for (let m = 2; m <= 7; m++) {
    for (let n = 1; n < m; n++) out.push({ m, n, f: 24 * (m * m + n * n) });
  }
  return out.sort((a, b) => a.f - b.f);
})();

const ARTICLE_URL = "https://rohankhullar.substack.com";

const F_MIN = 100;
const F_MAX = 2200;
const MAXP = 36000;
const TN = 1024;
const TMAX = 8;

// cos(kπx) lookup tables — the field is evaluated once per grain per frame,
// so this has to be a table read, not a Math.cos call.
const TBL: Float32Array[] = (() => {
  const t: Float32Array[] = [];
  for (let k = 0; k <= TMAX; k++) {
    const a = new Float32Array(TN);
    for (let i = 0; i < TN; i++) a[i] = Math.cos((k * Math.PI * i) / (TN - 1));
    t.push(a);
  }
  return t;
})();

type ActiveMode = [Float32Array, Float32Array, number];

// Every figure gets its own interval. The mode's two whole numbers become the
// ratio between the two voices, folded down into one useful register: (2,1) is
// an octave, (3,2) a fifth, (4,3) a fourth, (7,6) a grinding whole tone.
function partialRatio(m: number, n: number) {
  let r = m / n;
  while (r > 2.5) r /= 2;
  return r;
}

type Voice = {
  ctx: AudioContext;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  gainA: GainNode;
  gainB: GainNode;
  noiseGain: GainNode;
  band: BiquadFilterNode;
  master: GainNode;
};

export default function ChladniPlate() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqInputRef = useRef<HTMLInputElement | null>(null);
  const hzRef = useRef<HTMLSpanElement | null>(null);
  const freqLblRef = useRef<HTMLSpanElement | null>(null);
  const modeRef = useRef<HTMLSpanElement | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);
  const stampRef = useRef<HTMLSpanElement | null>(null);
  const chipRef = useRef<HTMLDivElement | null>(null);

  const [found, setFound] = useState<boolean[]>(() => MODES.map(() => false));
  const [sweeping, setSweeping] = useState(false);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const [bowLabel, setBowLabel] = useState(50);
  const [sandLabel, setSandLabel] = useState(22000);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(45);

  const voice = useRef<Voice | null>(null);
  const soundOn = useRef(false);
  const vol = useRef(0.45);

  const sim = useRef({
    freq: 312,
    bow: 0.5,
    count: 22000,
    sweeping: false,
    response: 0,
    locked: false,
    nearest: 2,
    act: [] as ActiveMode[],
    scatter: false,
  });

  /* ---------------- the bow ---------------- */

  // Built on the first click, never before: audio needs a user gesture, and a
  // portfolio page that starts humming on load is a bad page.
  const buildVoice = useCallback((): Voice | null => {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0;

    // plates get shrill up top, so roll the highs off before they reach anyone
    const tame = ctx.createBiquadFilter();
    tame.type = "lowpass";
    tame.frequency.value = 3600;
    tame.Q.value = 0.5;
    tame.connect(master);
    master.connect(ctx.destination);

    const oscA = ctx.createOscillator();
    oscA.type = "sine";
    const gainA = ctx.createGain();
    gainA.gain.value = 0;
    oscA.connect(gainA).connect(tame);

    const oscB = ctx.createOscillator();
    oscB.type = "triangle";
    oscB.detune.value = 4; // a few cents out, so the two voices beat slightly
    const gainB = ctx.createGain();
    gainB.gain.value = 0;
    oscB.connect(gainB).connect(tame);

    // the scrape of the bow itself
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(band).connect(noiseGain).connect(tame);

    oscA.start();
    oscB.start();
    noise.start();

    return { ctx, oscA, oscB, gainA, gainB, noiseGain, band, master };
  }, []);

  const toggleSound = useCallback(async () => {
    if (soundOn.current) {
      soundOn.current = false;
      setSound(false);
      const v = voice.current;
      if (v) v.master.gain.setTargetAtTime(0, v.ctx.currentTime, 0.05);
      return;
    }
    if (!voice.current) voice.current = buildVoice();
    const v = voice.current;
    if (!v) return;
    if (v.ctx.state === "suspended") await v.ctx.resume();
    soundOn.current = true;
    setSound(true);
    v.master.gain.setTargetAtTime(vol.current, v.ctx.currentTime, 0.08);
  }, [buildVoice]);

  // leaving the tab shouldn't leave a tone running behind you
  useEffect(() => {
    const onVis = () => {
      const v = voice.current;
      if (!v) return;
      const target = document.hidden ? 0 : soundOn.current ? vol.current : 0;
      v.master.gain.setTargetAtTime(target, v.ctx.currentTime, 0.05);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    return () => {
      const v = voice.current;
      voice.current = null;
      if (v) void v.ctx.close();
    };
  }, []);

  /* ---------------- mode weighting ---------------- */

  const updateModes = useCallback(() => {
    const s = sim.current;
    const ws = new Float64Array(MODES.length);
    let best = 0;
    let bi = 0;

    for (let i = 0; i < MODES.length; i++) {
      const bw = Math.max(12, MODES[i].f * 0.02);
      const d = (s.freq - MODES[i].f) / bw;
      const w = Math.exp(-d * d);
      ws[i] = w;
      if (w > best) {
        best = w;
        bi = i;
      }
    }

    s.response = best;
    s.nearest = bi;

    // keep the three strongest and normalise, so the field magnitude stays
    // comparable whether one mode dominates or two are fighting
    const order = Array.from(MODES.keys()).sort((a, b) => ws[b] - ws[a]);
    const keep = order.slice(0, 3);
    let tot = 0;
    for (const i of keep) tot += ws[i];
    if (tot < 1e-12) {
      tot = 1;
      ws[keep[0]] = 1;
    }

    const act: ActiveMode[] = [];
    for (const i of keep) {
      const nw = ws[i] / tot;
      if (nw > 0.004) act.push([TBL[MODES[i].n], TBL[MODES[i].m], nw]);
    }
    s.act = act;

    const wasLocked = s.locked;
    s.locked = best > 0.82;

    if (s.locked) {
      // returning `prev` unchanged makes React bail out, so this is cheap to
      // call on every sweep frame once the figure is already logged
      setFound((prev) => {
        if (prev[bi]) return prev;
        const next = prev.slice();
        next[bi] = true;
        return next;
      });
    }
    if (s.locked !== wasLocked) setLockedIdx(s.locked ? bi : null);
    if (s.locked && !wasLocked && chipRef.current) {
      const el = chipRef.current;
      el.classList.remove("chl-flash");
      void el.offsetWidth;
      el.classList.add("chl-flash");
    }

    const shown = Math.round(s.freq);
    if (hzRef.current) hzRef.current.textContent = String(shown);
    if (freqLblRef.current) freqLblRef.current.textContent = `${shown} Hz`;
    if (stampRef.current) stampRef.current.textContent = `${shown} Hz`;
    if (meterRef.current) meterRef.current.style.width = `${(best * 100).toFixed(1)}%`;
    if (modeRef.current) {
      modeRef.current.textContent = s.locked
        ? `${MODES[bi].m},${MODES[bi].n}`
        : "—";
    }
    if (chipRef.current) chipRef.current.style.opacity = s.locked ? "1" : "0";
  }, []);

  /* ---------------- the plate ---------------- */

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;

    const W = cv.width;
    const H = cv.height;

    // brushed-steel ground, built once
    const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 40, W * 0.5, H * 0.5, W * 0.78);
    g.addColorStop(0, "#1E2430");
    g.addColorStop(1, "#080B0F");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let q = 0; q < d.length; q += 4) {
      const nz = (Math.random() * 7 - 3.5) | 0;
      d[q] += nz;
      d[q + 1] += nz;
      d[q + 2] += nz;
    }
    const BG = new Uint8ClampedArray(d);

    const px = new Float32Array(MAXP);
    const py = new Float32Array(MAXP);
    const pa = new Float32Array(MAXP);
    const scatter = () => {
      for (let i = 0; i < MAXP; i++) {
        px[i] = Math.random();
        py[i] = Math.random();
        pa[i] = 1;
      }
    };
    scatter();

    const amp = (x: number, y: number) => {
      const act = sim.current.act;
      const ix = (x * (TN - 1)) | 0;
      const iy = (y * (TN - 1)) | 0;
      let s = 0;
      for (let i = 0; i < act.length; i++) {
        const a = act[i];
        s += a[2] * (a[0][ix] * a[1][iy] - a[1][ix] * a[0][iy]);
      }
      return s < 0 ? -s * 0.5 : s * 0.5;
    };

    let raf = 0;

    const frame = () => {
      const s = sim.current;

      if (s.scatter) {
        s.scatter = false;
        scatter();
      }

      if (s.sweeping) {
        s.freq += 0.42 * (1 - 0.86 * s.response); // linger on the figures
        if (s.freq > F_MAX) s.freq = F_MIN;
        if (freqInputRef.current) freqInputRef.current.value = String(Math.round(s.freq));
        updateModes();
      }

      // The plate is the instrument: pitch follows the dial, loudness follows
      // how hard the plate is actually responding. Between modes you hear the
      // bow and not much else.
      const v = voice.current;
      if (v && soundOn.current) {
        const t = v.ctx.currentTime;
        const md = MODES[s.nearest];
        const tilt = 1 - 0.35 * ((s.freq - F_MIN) / (F_MAX - F_MIN));
        const ring = s.response;
        v.oscA.frequency.setTargetAtTime(s.freq, t, 0.015);
        v.oscB.frequency.setTargetAtTime(s.freq * partialRatio(md.m, md.n), t, 0.015);
        v.band.frequency.setTargetAtTime(s.freq, t, 0.015);
        v.gainA.gain.setTargetAtTime((0.02 + 0.16 * ring) * tilt, t, 0.03);
        v.gainB.gain.setTargetAtTime((0.004 + 0.075 * ring) * tilt, t, 0.03);
        v.noiseGain.gain.setTargetAtTime(0.014 * s.bow * (0.3 + 0.7 * ring), t, 0.03);
      }

      // Each grain hops at random, harder where the plate moves more, and only
      // keeps the hop if it lands somewhere calmer. What's left is the figure.
      const n = s.count;
      const drive = 0.25 + 0.75 * s.response;
      const hop = (0.003 + 0.055 * s.bow) * drive;
      const temp = (0.005 + 0.045 * s.bow) * drive;

      for (let i = 0; i < n; i++) {
        const a0 = pa[i];
        const step = hop * (a0 + 0.05);
        let nx = px[i] + (Math.random() - 0.5) * step * 2;
        let ny = py[i] + (Math.random() - 0.5) * step * 2;
        if (nx < 0) nx = -nx;
        else if (nx > 1) nx = 2 - nx;
        if (ny < 0) ny = -ny;
        else if (ny > 1) ny = 2 - ny;
        const a1 = amp(nx, ny);
        if (a1 <= a0 || Math.random() < Math.exp(-(a1 - a0) / temp)) {
          px[i] = nx;
          py[i] = ny;
          pa[i] = a1;
        }
      }

      d.set(BG);
      const sx = W - 1;
      const sy = H - 1;
      for (let i = 0; i < n; i++) {
        const o = (((py[i] * sy) | 0) * W + ((px[i] * sx) | 0)) << 2;
        d[o] += 54;
        d[o + 1] += 50;
        d[o + 2] += 42;
      }
      ctx.putImageData(img, 0, 0);

      raf = requestAnimationFrame(frame);
    };

    updateModes();
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [updateModes]);

  /* ---------------- controls ---------------- */

  const onFreq = (e: React.ChangeEvent<HTMLInputElement>) => {
    sim.current.freq = Number(e.target.value);
    sim.current.sweeping = false;
    setSweeping(false);
    updateModes();
  };

  const jumpTo = (i: number) => {
    sim.current.freq = MODES[i].f;
    sim.current.sweeping = false;
    setSweeping(false);
    if (freqInputRef.current) freqInputRef.current.value = String(MODES[i].f);
    updateModes();
  };

  const toggleSweep = () => {
    const next = !sim.current.sweeping;
    sim.current.sweeping = next;
    setSweeping(next);
  };

  const savePlate = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const s = sim.current;
    const tag = s.locked ? `${MODES[s.nearest].m}-${MODES[s.nearest].n}` : "off";
    const a = document.createElement("a");
    a.download = `chladni-${Math.round(s.freq)}hz-${tag}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
  };

  const foundCount = found.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-12 sm:px-8">
      <style>{`
        .chl-range{-webkit-appearance:none;appearance:none;width:100%;height:20px;margin:0;background:transparent;cursor:pointer}
        .chl-range::-webkit-slider-runnable-track{height:2px;background:#334155}
        .chl-range::-moz-range-track{height:2px;background:#334155}
        .chl-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;margin-top:-6px;border-radius:9999px;background:#0d9488;border:2px solid #ccfbf1}
        .chl-range::-moz-range-thumb{width:14px;height:14px;border-radius:9999px;background:#0d9488;border:2px solid #ccfbf1}
        .chl-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px rgba(13,148,136,.4)}
        .chl-range:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px rgba(13,148,136,.4)}
        @keyframes chl-flash{0%{background:#ccfbf1;color:#042f2e}100%{background:transparent;color:#5eead4}}
        .chl-flash{animation:chl-flash .7s ease-out}
        @media (prefers-reduced-motion: reduce){.chl-flash{animation:none}}
      `}</style>

      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Acoustic apparatus · after Ernst Chladni, 1787
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">The Chladni Plate</h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            Sand on a steel plate. Drive it at the wrong frequency and nothing happens. Hit a{" "}
            <span className="font-semibold text-slate-200">resonance</span> and the grains flee the
            shaking regions and pile up along the lines that stand perfectly still. There are 21
            figures hidden in this dial. Go find them.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* plate */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-[#0A0D12]">
              <canvas
                ref={canvasRef}
                width={800}
                height={800}
                className="block h-full w-full"
                aria-label="Sand grains settling on a vibrating square plate"
              />
              <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[11px] uppercase tracking-widest text-[rgba(233,222,196,0.4)]">
                Plate I · square steel ·{" "}
                <span ref={stampRef} className="text-teal-300">
                  312 Hz
                </span>
              </div>
              <div
                ref={chipRef}
                style={{ opacity: 0 }}
                className="pointer-events-none absolute bottom-3 right-4 border border-teal-500/50 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-teal-300 transition-opacity duration-200"
              >
                Resonance
              </div>
            </div>
          </div>

          {/* console */}
          <aside className="flex flex-col gap-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  ref={hzRef}
                  className="text-5xl font-bold tabular-nums leading-none text-white"
                >
                  312
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  Hz
                </span>
              </div>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-slate-500">
                Mode <span ref={modeRef} className="text-accent">3,2</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="chl-freq"
                className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
              >
                Frequency
                <span ref={freqLblRef} className="tabular-nums text-slate-300">
                  312 Hz
                </span>
              </label>
              <div className="relative pb-2">
                <input
                  id="chl-freq"
                  ref={freqInputRef}
                  type="range"
                  min={F_MIN}
                  max={F_MAX}
                  step={1}
                  defaultValue={312}
                  onChange={onFreq}
                  className="chl-range"
                />
                <div className="pointer-events-none absolute inset-x-2 bottom-0 h-1.5">
                  {MODES.map((mode, i) =>
                    found[i] ? (
                      <i
                        key={mode.f}
                        className="absolute bottom-0 h-1.5 w-px bg-accent"
                        style={{ left: `${((mode.f - F_MIN) / (F_MAX - F_MIN)) * 100}%` }}
                      />
                    ) : null
                  )}
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  ref={meterRef}
                  className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-300"
                  style={{ width: "0%" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="chl-bow"
                className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
              >
                Bow pressure
                <span className="tabular-nums text-slate-300">{bowLabel}</span>
              </label>
              <input
                id="chl-bow"
                type="range"
                min={5}
                max={100}
                step={1}
                value={bowLabel}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBowLabel(v);
                  sim.current.bow = v / 100;
                }}
                className="chl-range"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="chl-sand"
                className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
              >
                Sand
                <span className="tabular-nums text-slate-300">
                  {sandLabel.toLocaleString("en-US")}
                </span>
              </label>
              <input
                id="chl-sand"
                type="range"
                min={4000}
                max={36000}
                step={1000}
                value={sandLabel}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSandLabel(v);
                  sim.current.count = v;
                }}
                className="chl-range"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleSound}
                aria-pressed={sound}
                className={`rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
                  sound
                    ? "border-accent bg-accent/15 text-teal-300"
                    : "border-slate-700 text-slate-300 hover:border-accent hover:text-teal-300"
                }`}
              >
                {sound ? "Sound on" : "Sound off"}
              </button>
              <label htmlFor="chl-vol" className="sr-only">
                Volume
              </label>
              <input
                id="chl-vol"
                type="range"
                min={0}
                max={100}
                step={1}
                value={volume}
                disabled={!sound}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  vol.current = val / 100;
                  const v = voice.current;
                  if (v && soundOn.current) {
                    v.master.gain.setTargetAtTime(vol.current, v.ctx.currentTime, 0.03);
                  }
                }}
                className={`chl-range flex-1 ${sound ? "" : "opacity-40"}`}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleSweep}
                aria-pressed={sweeping}
                className={`flex-1 rounded-md border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
                  sweeping
                    ? "border-accent bg-accent/15 text-teal-300"
                    : "border-slate-700 text-slate-300 hover:border-accent hover:text-teal-300"
                }`}
              >
                Sweep
              </button>
              <button
                onClick={() => {
                  sim.current.scatter = true;
                }}
                className="flex-1 rounded-md border border-slate-700 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-300 transition-colors hover:border-accent hover:text-teal-300"
              >
                Sprinkle
              </button>
              <button
                onClick={savePlate}
                className="flex-1 rounded-md border border-slate-700 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-300 transition-colors hover:border-accent hover:text-teal-300"
              >
                Save
              </button>
            </div>

            <div>
              <h2 className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Register of figures
                <span className="tabular-nums text-accent">
                  {foundCount} / {MODES.length}
                </span>
              </h2>
              <div className="grid max-w-[340px] grid-cols-7 gap-1">
                {MODES.map((mode, i) => (
                  <button
                    key={mode.f}
                    disabled={!found[i]}
                    onClick={() => jumpTo(i)}
                    title={found[i] ? `${mode.f} Hz` : undefined}
                    aria-label={
                      found[i] ? `Mode ${mode.m},${mode.n} at ${mode.f} hertz` : "Undiscovered figure"
                    }
                    className={`flex aspect-square items-center justify-center rounded border font-mono text-[10px] ${
                      found[i]
                        ? "cursor-pointer border-accent/60 bg-accent/20 text-teal-100 hover:border-teal-300"
                        : "cursor-default border-slate-800 text-slate-700"
                    } ${lockedIdx === i ? "ring-1 ring-teal-300" : ""}`}
                  >
                    {found[i] ? `${mode.m},${mode.n}` : "·"}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-12 grid gap-8 border-t border-slate-800 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              What you&apos;re looking at
            </h3>
            <p className="text-sm text-slate-400">
              Each grain takes a random hop every frame, and hops harder where the plate moves more.
              So it random-walks until it stumbles onto a{" "}
              <em className="text-slate-300">nodal line</em> — a place with no motion — and then it
              stops. The pattern isn&apos;t drawn. It&apos;s what&apos;s left over.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Finding a figure
            </h3>
            <p className="text-sm text-slate-400">
              Drag the dial coarsely, then hold the arrow keys to creep 1 Hz at a time. The meter
              under the dial is the plate&apos;s response. Above about 80% the figure snaps into
              focus and gets logged. <em className="text-slate-300">Sweep</em> hunts for you, slowing
              as it nears one.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              The modes
            </h3>
            <p className="text-sm text-slate-400">
              A square plate rings at frequencies set by two whole numbers — how many half-waves fit
              across it each way. Higher pairs sit closer together, so the top of the dial is crowded
              and the figures there are hard to isolate. That is also true of real plates.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              What you&apos;re hearing
            </h3>
            <p className="text-sm text-slate-400">
              Turn on Sound and the dial becomes a pitch. Loudness tracks the plate&apos;s real
              response, so between resonances you hear the bow and little else, and the tone blooms
              as a figure forms. Each figure carries its own interval, taken from its two mode
              numbers: <em className="text-slate-300">2,1</em> is an octave,{" "}
              <em className="text-slate-300">3,2</em> a fifth,{" "}
              <em className="text-slate-300">4,3</em> a fourth. The crowded high modes are the
              dissonant ones. Run Sweep with the sound up.
            </p>
          </div>
        </footer>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            How this got built
          </h2>
          <div className="mt-3 grid gap-4 text-sm text-slate-400 md:grid-cols-2">
            <p>
              I asked Claude Opus for &ldquo;something fun&rdquo; and gave it nothing else. No spec,
              no audience, no constraint. It came back with an acoustics experiment from 1787, then
              built the colour palette out of brass instruments and picked a condensed typeface
              because a plate is an instrument panel. None of that was in the prompt.
            </p>
            <p>
              It also shipped a bug worth keeping. The first confidence meter scored the winning
              mode as a share of all modes, so at 150 Hz it read 99.99% certain on a plate that
              wasn&apos;t moving at all. A ratio doesn&apos;t care about scale. When I later asked
              for sound, it derived the musical intervals from the same two whole numbers that
              decide each figure&apos;s shape.
            </p>
          </div>
          <a
            href={ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center font-mono text-[11px] uppercase tracking-[0.15em] text-teal-300 underline decoration-teal-300/40 underline-offset-4 transition-colors hover:decoration-teal-300"
          >
            Read the full build log →
          </a>
        </section>
      </div>
    </div>
  );
}
