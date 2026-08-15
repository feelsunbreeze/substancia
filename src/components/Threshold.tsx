import { useEffect, useMemo, useState } from "react";
import { KEYS } from "../lib/localState";
import "./Threshold.css";

const KEY = KEYS.threshold;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 320;
const H = 132;

const PIGMENTS = ["--psychedelic", "--stimulants", "--depressant", "--entactogen", "--opioids", "--dissociatives"];

interface Mote {
  fx: number; fy: number; tx: number; ty: number; r: number; hue: string; delay: number;
}

function useMotes(count: number, clusters: [number, number][]): Mote[] {
  return useMemo(() => {
    const rnd = mulberry32(20260721);
    const out: Mote[] = [];
    for (let i = 0; i < count; i++) {
      const c = clusters[i % clusters.length];
      const spread = 15 + rnd() * 13;
      const angle = rnd() * Math.PI * 2;
      out.push({
        fx: 22 + rnd() * (W - 44),
        fy: 16 + rnd() * (H - 32),
        tx: c[0] + Math.cos(angle) * spread,
        ty: c[1] + Math.sin(angle) * spread * 0.8,
        r: 2 + rnd() * 2.6,
        hue: PIGMENTS[Math.floor(rnd() * PIGMENTS.length)],
        delay: rnd() * 320,
      });
    }
    return out;
  }, [count, clusters]);
}

const CLUSTERS: [number, number][] = [
  [66, 52],
  [166, 88],
  [252, 46],
];

function Scene({ step }: { step: number }) {
  const motes = useMotes(26, CLUSTERS);

  const gathered = step !== 0;

  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <svg className="th-scene" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {step === 3 && (
        <g className="th-links">
          {motes.slice(0, 7).map((m, i) => (
            <line
              key={i}
              x1={CLUSTERS[0][0]}
              y1={CLUSTERS[0][1]}
              x2={m.tx}
              y2={m.ty}
              style={{ animationDelay: `${240 + i * 70}ms` }}
            />
          ))}
        </g>
      )}

      {step === 2 && (
        <g className="th-region-labels">
          {[
            ["colour shifting", 0],
            ["muscle relaxation", 1],
            ["itchiness", 2],
          ].map(([label, ci]) => (
            <text
              key={label as string}
              x={CLUSTERS[ci as number][0]}
              y={CLUSTERS[ci as number][1] - 26}
              textAnchor="middle"
              style={{ animationDelay: `${200 + (ci as number) * 180}ms` }}
            >
              {label as string}
            </text>
          ))}
        </g>
      )}

      <g className="th-motes">
        {motes.map((m, i) => (
          <circle
            key={i}
            r={m.r}
            fill={`var(${m.hue})`}
            style={{
              transform: `translate(${gathered ? m.tx : m.fx}px, ${gathered ? m.ty : m.fy}px) scale(${settled ? 1 : 0})`,
              opacity: settled ? 0.92 : 0,
              transitionDelay: `${m.delay}ms`,
            }}
          />
        ))}
      </g>

      {step === 3 && (
        <g className="th-cursor" transform={`translate(${CLUSTERS[0][0]},${CLUSTERS[0][1]})`}>
          <path d="M0 0 L0 11 L3 8.4 L5.2 13 L7 12 L4.8 7.6 L8.6 7.2 Z" />
        </g>
      )}
    </svg>
  );
}

interface Panel {
  kicker: string;
  title: string;
  body: string;
}

const PANELS: Panel[] = [
  {
    kicker: "welcome",
    title: "Substancia",
    body:
      "A field guide to how psychoactive substances feel — 288 specimens drawn from PsychonautWiki, each annotated with the subjective effects people report. Reference material, not advice.",
  },
  {
    kicker: "reading the map",
    title: "Position means similarity",
    body:
      "Every specimen is placed by the effects it produces, then projected down to two dimensions. Two dots sitting together feel alike — whatever their chemistry says about them.",
  },
  {
    kicker: "the regions",
    title: "Families that named themselves",
    body:
      "Nobody assigned these groupings. They fell out of the clustering, and each one is titled with the effects that define it — so the map explains its own shape.",
  },
  {
    kicker: "moving around",
    title: "Hover, click, wander",
    body:
      "Hover a specimen to light up its nearest kin. Click to open its plate. Scroll to zoom, and names fill in as you go. ⌘K searches everything; Esc brings you back up.",
  },
];

export default function Threshold() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
    }
    const reopen = () => { setStep(0); setLeaving(false); setOpen(true); };
    window.addEventListener("substancia:threshold", reopen);
    return () => window.removeEventListener("substancia:threshold", reopen);
  }, []);

  function dismiss() {
    setLeaving(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
    }
    window.setTimeout(() => setOpen(false), 420);
  }

  function go(next: number) {
    if (next < 0) return;
    if (next >= PANELS.length) { dismiss(); return; }
    setStep(next);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); dismiss(); }
      else if (e.key === "Enter" || e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(step + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  if (!open) return null;
  const panel = PANELS[step];
  const last = step === PANELS.length - 1;

  return (
    <div className={`threshold${leaving ? " leaving" : ""}`}>
      <div className="threshold-card">
        <Scene step={step} />

        <div className="threshold-text" key={step}>
          <div className="threshold-kicker">{panel.kicker}</div>
          <h2 className={`threshold-title${step === 0 ? " grand" : ""}`}>{panel.title}</h2>
          <p className="threshold-body">{panel.body}</p>
        </div>

        <div className="threshold-foot">
          <div className="threshold-pips">
            {PANELS.map((p, i) => (
              <button
                key={i}
                className={`threshold-pip${i === step ? " on" : ""}${i < step ? " done" : ""}`}
                aria-label={p.kicker}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
          <div className="threshold-actions">
            {step > 0 && (
              <button className="threshold-skip" onClick={() => go(step - 1)}>back</button>
            )}
            <button className="threshold-skip" onClick={dismiss}>
              {last ? "" : "skip"}
            </button>
            <button className="threshold-next" onClick={() => go(step + 1)}>
              {last ? "begin ▸" : "next ▸"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
