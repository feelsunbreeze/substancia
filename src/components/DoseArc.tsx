import { useId } from "react";
import { Range } from "../lib/api";
import "./DoseArc.css";

/* ─────────────────────────────────────────────────────────────────────────
   The Arc — a compound's kinetic signature.

   Instead of a flat progress bar, every substance gets a silhouette: an
   intensity-over-time curve synthesized from its onset / come-up / peak /
   offset / afterglow phases. The shape is the fingerprint. A lightweight
   classifier names the archetype (Spike, Comet, Mesa, Wave, Needle), and two
   markers flag the derivative extremes — where intensity is changing fastest
   (ignition) and where it falls away hardest (descent), which is often where
   an experience actually feels most destabilizing.
   ───────────────────────────────────────────────────────────────────────── */

const W = 320;
const H = 104;
const PAD_T = 10;
const PAD_B = 20;
const BASE = H - PAD_B; // y-pixel of the zero-intensity baseline
const AMP = BASE - PAD_T; // vertical room for full intensity

function toMinutes(r: Range | null | undefined): number | null {
  if (!r) return null;
  const vals = [r.min, r.max].filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const u = (r.units ?? "").toLowerCase();
  const factor = u.startsWith("hour") ? 60 : u.startsWith("second") ? 1 / 60 : 1;
  return avg * factor;
}

function fmtDur(mins: number): string {
  if (mins >= 60) {
    const h = mins / 60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  if (mins < 1) return `${Math.round(mins * 60)}s`;
  return `${Math.round(mins)}m`;
}

/** Compact "15–30m" style range straight from the source units. */
function fmtRangeShort(r: Range | null | undefined): string | null {
  if (!r) return null;
  const u = (r.units ?? "").toLowerCase();
  const s = u.startsWith("hour") ? "h" : u.startsWith("second") ? "s" : "m";
  const n = (v: number) => (v % 1 === 0 ? `${v}` : `${v}`);
  if (r.min != null && r.max != null && r.min !== r.max) return `${n(r.min)}–${n(r.max)}${s}`;
  const only = r.min ?? r.max;
  return only != null ? `${n(only)}${s}` : null;
}

// smootherstep — zero 1st & 2nd derivatives at the ends, so rises ease in and
// out and plateaus stay genuinely flat (no Catmull-Rom overshoot bumps).
function ease(u: number): number {
  return u * u * u * (u * (u * 6 - 15) + 10);
}

type Phases = {
  onset: number;
  comeup: number;
  peak: number;
  offset: number;
  afterglow: number;
  total: number;
  synth: boolean; // phases were inferred from `total`, not directly recorded
};

function derivePhases(d: Record<string, Range | null>): Phases | null {
  const onset = toMinutes(d.onset) ?? 0;
  let comeup = toMinutes(d.comeup);
  let peak = toMinutes(d.peak);
  let offset = toMinutes(d.offset);
  const afterglow = toMinutes(d.afterglow) ?? 0;
  const totalRec = toMinutes(d.total);

  const realActive = (comeup ?? 0) + (peak ?? 0) + (offset ?? 0);
  let synth = false;

  if (realActive <= 0) {
    // only a total (or nothing) — invent a plausible rise/hold/fall so the
    // compound still has a silhouette rather than a dead bar.
    const total = totalRec ?? (onset > 0 ? onset * 4 : 60);
    const span = Math.max(total - onset, total * 0.5);
    comeup = span * 0.25;
    peak = span * 0.2;
    offset = span * 0.55;
    synth = true;
  } else {
    comeup = comeup ?? realActive * 0.15;
    peak = peak ?? realActive * 0.2;
    offset = offset ?? realActive * 0.4;
  }

  const total = totalRec ?? onset + comeup + peak + offset;
  if (onset + comeup + peak + offset <= 0) return null;
  return { onset, comeup, peak, offset, afterglow, total, synth };
}

type Archetype = { name: string; note: string };

function classify(p: Phases): Archetype {
  const active = p.comeup + p.peak + p.offset;
  const plat = active > 0 ? p.peak / active : 0;
  const rise = active > 0 ? p.comeup / active : 0;
  const fall = active > 0 ? p.offset / active : 0;

  if (p.total <= 20) return { name: "Needle", note: "brief · near-vertical" };
  if (active <= 120 && plat < 0.34) return { name: "Spike", note: "sharp rise · sharp fall" };
  if (rise < 0.22 && fall >= 0.5) return { name: "Comet", note: "fast ignition · long descent" };
  if (plat >= 0.42) return { name: "Mesa", note: "slow climb · broad plateau" };
  return { name: "Wave", note: "rounded swell" };
}

type Pt = { t: number; y: number };

function keypoints(p: Phases): Pt[] {
  const a = p.onset;
  const b = a + p.comeup;
  const cMid = b + p.peak / 2;
  const c = b + p.peak;
  const dEnd = c + p.offset;
  // always return to baseline; if there's an afterglow, ride a low tail out
  const tail = p.afterglow > 0 ? p.afterglow : (p.comeup + p.peak + p.offset) * 0.06;
  return [
    { t: 0, y: 0 },
    { t: a, y: 0.03 },
    { t: b, y: 0.95 },
    { t: cMid, y: 1.0 },
    { t: c, y: 0.93 },
    { t: dEnd, y: p.afterglow > 0 ? 0.14 : 0.05 },
    { t: dEnd + tail, y: 0 },
  ];
}

/** Sample the eased curve densely so straight SVG segments read as smooth. */
function sample(kp: Pt[], per = 22): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < kp.length - 1; i++) {
    const p0 = kp[i];
    const p1 = kp[i + 1];
    const steps = i === kp.length - 2 ? per : per;
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      out.push({ t: p0.t + (p1.t - p0.t) * u, y: p0.y + (p1.y - p0.y) * ease(u) });
    }
  }
  out.push(kp[kp.length - 1]);
  return out;
}

export default function DoseArc({
  duration,
  color,
}: {
  duration: Record<string, Range | null>;
  color: string;
}) {
  const gid = useId().replace(/[:]/g, "");
  const phases = derivePhases(duration);
  if (!phases) return <div className="arc-empty">no timing recorded</div>;

  const arch = classify(phases);
  const pts = sample(keypoints(phases));

  // square-root time axis: keeps the onset/come-up dynamics detailed while
  // compressing very long tails (afterglow can be 48h) so the shape stays legible.
  const end = pts[pts.length - 1].t || 1;
  const sq = Math.sqrt(end);
  const xOf = (t: number) => (Math.sqrt(Math.max(t, 0)) / sq) * W;
  const yOf = (y: number) => BASE - y * AMP;

  const xy = pts.map((p) => ({ ...p, px: xOf(p.t), py: yOf(p.y) }));
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.px.toFixed(2)} ${p.py.toFixed(2)}`).join(" ");
  const area = `${line} L${W} ${BASE} L0 ${BASE} Z`;

  // derivative extremes — steepest rise (ignition) and steepest fall (descent),
  // located in data space then mapped back onto the curve.
  let ignI = -1, descI = -1, maxRise = 0, maxFall = 0;
  const peakStartT = phases.onset + phases.comeup + phases.peak / 2;
  for (let i = 1; i < pts.length; i++) {
    const dt = pts[i].t - pts[i - 1].t;
    if (dt <= 0) continue;
    const slope = (pts[i].y - pts[i - 1].y) / dt;
    if (pts[i].t <= peakStartT && slope > maxRise) { maxRise = slope; ignI = i; }
    if (pts[i].t > peakStartT && slope < maxFall) { maxFall = slope; descI = i; }
  }
  const marker = (i: number) => (i >= 0 ? { x: xOf(pts[i].t), y: yOf(pts[i].y) } : null);
  const ign = marker(ignI);
  const desc = marker(descI);

  const phaseText = [
    ["onset", duration.onset],
    ["come-up", duration.comeup],
    ["peak", duration.peak],
    ["offset", duration.offset],
  ]
    .map(([label, r]) => {
      const t = fmtRangeShort(r as Range | null);
      return t ? `${label} ${t}` : null;
    })
    .filter(Boolean) as string[];

  const totalTxt = fmtRangeShort(duration.total) ?? fmtDur(phases.total);
  const afterTxt = fmtRangeShort(duration.afterglow);

  return (
    <div className="ksig">
      <div className="ksig-head">
        <span className="ksig-arch" style={{ color }}>{arch.name}</span>
        <span className="ksig-note">{arch.note}</span>
      </div>

      <svg className="ksig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${arch.name} intensity curve`}>
        <defs>
          <linearGradient id={`fill${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* plateau band — a faint marker of the "peak" window */}
        {phases.peak > 0 && !phases.synth && (
          <rect
            className="ksig-plateau"
            x={xOf(phases.onset + phases.comeup)}
            y={PAD_T}
            width={Math.max(xOf(phases.onset + phases.comeup + phases.peak) - xOf(phases.onset + phases.comeup), 1)}
            height={BASE - PAD_T}
          />
        )}

        <line className="ksig-baseline" x1="0" y1={BASE} x2={W} y2={BASE} />
        <path className="ksig-area" d={area} fill={`url(#fill${gid})`} />
        <path className="ksig-line" d={line} pathLength={1} stroke={color} />

        {ign && (
          <g className="ksig-mark ign">
            <line x1={ign.x} y1={ign.y} x2={ign.x} y2={BASE} stroke={color} />
            <circle cx={ign.x} cy={ign.y} r={3} stroke={color} />
          </g>
        )}
        {desc && (
          <g className="ksig-mark desc">
            <line x1={desc.x} y1={desc.y} x2={desc.x} y2={BASE} stroke={color} />
            <circle cx={desc.x} cy={desc.y} r={3} stroke={color} />
          </g>
        )}
      </svg>

      {phaseText.length > 0 && <div className="ksig-phases">{phaseText.join("  ·  ")}</div>}
      <div className="ksig-total">
        <span>≈ {totalTxt}</span>
        {afterTxt && <span className="ksig-after">afterglow {afterTxt}</span>}
      </div>
    </div>
  );
}
