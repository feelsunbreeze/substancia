import { useEffect, useMemo, useState } from "react";
import { EffectAxes, EffectItem, DivergenceRow, pigment } from "../lib/api";
import { useCartouche } from "./Cartouche";
import "./Sigils.css";

const VIEW_W = 236;

const AXIS_ORDER = [
  "Visual",
  "Auditory",
  "Multisensory",
  "Cognitive",
  "Transpersonal",
  "Physical",
  "Disconnective",
];

const AXIS_ALIASES: Record<string, string> = { Sensory: "Multisensory" };

const FALLBACK_SCALE: Record<string, number> = {
  Visual: 19,
  Auditory: 3,
  Multisensory: 2,
  Cognitive: 24,
  Transpersonal: 5,
  Physical: 26,
  Disconnective: 3,
};

const MODALITY_PIGMENT: Record<string, string> = {
  Visual: "--psychedelic",
  Auditory: "--antidepressants",
  Multisensory: "--hallucinogens",
  Cognitive: "--eugeroics",
  Transpersonal: "--oneirogen",
  Physical: "--opioids",
  Disconnective: "--antipsychotic",
};

const MODALITY_SHORT: Record<string, string> = {
  Visual: "visual",
  Auditory: "auditory",
  Multisensory: "multi",
  Cognitive: "cognitive",
  Transpersonal: "transpers.",
  Physical: "physical",
  Disconnective: "disconn.",
};

function useReveal(key: string, delay = 90) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(t);
  }, [key, delay]);
  return on;
}

const R = 58;
const CX = 118;
const CY = 104;

function polar(i: number, n: number, radius: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

export function Signature({
  name,
  sections,
  category,
  effects,
  axes,
  onEffect,
}: {
  name: string;
  sections: Record<string, EffectItem[]>;
  category: string;
  effects: string[];
  axes: EffectAxes | null;
  onEffect: (n: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const drawn = useReveal(name);
  const tip = useCartouche();

  const order = axes?.order?.length ? axes.order : AXIS_ORDER;
  const scale = axes?.scale ?? FALLBACK_SCALE;

  const values = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(order.map((a) => [a, 0]));
    for (const [section, items] of Object.entries(sections ?? {})) {
      const axis = AXIS_ALIASES[section] ?? section;
      if (!(axis in counts)) continue;
      counts[axis] = new Set(items.map((i) => i.name)).size;
    }
    return order.map((axis) => {
      const count = counts[axis] ?? 0;
      return { axis, count, v: Math.min(1, count / (scale[axis] || 1)) };
    });
  }, [sections, order, scale]);

  const total = values.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const n = order.length;
  const points = values.map((d, i) => polar(i, n, 5 + d.v * (R - 5)));
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + " Z";
  const hue = pigment(category);
  const active = hover !== null ? values[hover] : null;

  return (
    <div className="sig">
      <svg className="sig-svg" viewBox={`0 0 ${VIEW_W} 208`} role="img"
           aria-label={`Effect profile across ${n} modalities`}>
        {[0.33, 0.66, 1].map((f) => (
          <polygon
            key={f}
            className="sig-ring"
            points={Array.from({ length: n }, (_, i) => polar(i, n, 5 + f * (R - 5)).join(",")).join(" ")}
          />
        ))}
        {values.map((_, i) => {
          const [x, y] = polar(i, n, R);
          return <line key={i} className="sig-spoke" x1={CX} y1={CY} x2={x} y2={y} />;
        })}

        <path
          className={`sig-shape${drawn ? " drawn" : ""}`}
          d={path}
          style={{ fill: hue, stroke: hue, transformOrigin: `${CX}px ${CY}px` }}
        />

        {values.map((d, i) => {
          const [x, y] = points[i];
          const [lx, ly] = polar(i, n, R + 17);
          const anchor = Math.abs(lx - CX) < 6 ? "middle" : lx > CX ? "start" : "end";
          return (
            <g key={d.axis}>
              <circle
                className={`sig-vertex${hover === i ? " on" : ""}${drawn ? " drawn" : ""}`}
                cx={x}
                cy={y}
                r={hover === i ? 4.2 : 2.6}
                style={{ fill: `var(${MODALITY_PIGMENT[d.axis] ?? "--uncategorized"})` }}
              />
              <text className={`sig-axis${hover === i ? " on" : ""}`} x={lx} y={ly} textAnchor={anchor} dy="0.32em">
                {MODALITY_SHORT[d.axis] ?? d.axis.toLowerCase()}
              </text>
              <circle
                className="sig-hit"
                cx={x}
                cy={y}
                r={14}
                onMouseEnter={(e) => {
                  setHover(i);
                  tip.show(e, {
                    title: d.axis,
                    subtitle: `${Math.round(d.v * 100)}% of the corpus range`,
                    accent: `var(${MODALITY_PIGMENT[d.axis] ?? "--uncategorized"})`,
                    rows: [{ label: "distinct effects", value: String(d.count), bar: d.v }],
                    note:
                      d.count === 0
                        ? `No ${d.axis.toLowerCase()} effects are recorded for this specimen.`
                        : undefined,
                  });
                }}
                onMouseMove={tip.move}
                onMouseLeave={() => {
                  setHover(null);
                  tip.hide();
                }}
              />
            </g>
          );
        })}
      </svg>

      <div className="sig-readout">
        {active ? (
          <>
            <span className="sig-readout-n">{active.count}</span>
            <span className="sig-readout-l">
              {active.axis.toLowerCase()} effect{active.count === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="sig-readout-hint">{total} effects across {values.filter((d) => d.count).length} modalities</span>
        )}
      </div>

      {effects.length > 0 && (
        <div className="sig-most">
          <div className="sig-most-label">most distinctive</div>
          <div className="sig-most-list">
            {effects.slice(0, 6).map((e, i) => (
              <span key={e}>
                <button className="sig-most-link" onClick={() => onEffect(e)}>{e}</button>
                {i < Math.min(effects.length, 6) - 1 && <span className="sig-most-sep"> · </span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface KinRow {
  name: string;
  score: number;
  category: string;
}

const KIN_LEFT = 10;
const KIN_RIGHT = VIEW_W - 12;
const KIN_TOP = 26;
const KIN_STEP = 25;

export function Kinship({
  id,
  rows,
  domain,
  onPick,
}: {
  id: string;
  rows: KinRow[];
  domain: [number, number];
  onPick: (name: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = useReveal(id);
  const tip = useCartouche();
  const [lo, hi] = domain;
  const span = Math.max(0.001, hi - lo);
  const H = KIN_TOP + rows.length * KIN_STEP + 6;

  return (
    <div className="kin">
      <svg className="kin-svg" viewBox={`0 0 ${VIEW_W} ${H}`} role="img" aria-label="Relatives by similarity">
        <text className="kin-cap" x={KIN_LEFT} y={10}>closer</text>
        <text className="kin-cap" x={KIN_RIGHT} y={10} textAnchor="end">further</text>
        <line className="kin-axis" x1={KIN_LEFT} y1={16} x2={KIN_RIGHT} y2={16} />
        <line className="kin-anchor" x1={KIN_LEFT} y1={16} x2={KIN_LEFT} y2={H - 8} />

        {rows.map((r, i) => {
          const t = Math.max(0, Math.min(1, (hi - r.score) / span));
          const x = KIN_LEFT + t * (KIN_RIGHT - KIN_LEFT - 24);
          const y = KIN_TOP + i * KIN_STEP;
          const on = hover === r.name;
          const labelRight = x < VIEW_W * 0.42;
          return (
            <g
              key={r.name}
              className={`kin-g${on ? " on" : ""}${shown ? " in" : ""}`}
              style={{ transitionDelay: `${i * 55}ms` }}
              onMouseEnter={(e) => {
                setHover(r.name);
                tip.show(e, {
                  title: r.name,
                  subtitle: r.category,
                  accent: pigment(r.category),
                  rows: [{ label: "similarity", value: r.score.toFixed(2), bar: r.score }],
                  note: "Open this specimen ▸",
                });
              }}
              onMouseMove={tip.move}
              onMouseLeave={() => {
                setHover(null);
                tip.hide();
              }}
              onClick={() => onPick(r.name)}
            >
              <line className="kin-tether" x1={KIN_LEFT} y1={y} x2={x} y2={y} />
              <circle
                className="kin-dot"
                cx={x}
                cy={y}
                r={on ? 5 : 3.6}
                style={{ fill: pigment(r.category) }}
              />
              <text
                className="kin-name"
                x={labelRight ? x + 9 : x - 9}
                y={y}
                dy="0.32em"
                textAnchor={labelRight ? "start" : "end"}
              >
                {r.name}
              </text>
              <rect className="kin-hit" x={0} y={y - 11} width={VIEW_W} height={22} />
            </g>
          );
        })}
      </svg>
      <div className="kin-readout">
        {hover ? (
          <>
            <span className="kin-readout-n">
              {rows.find((r) => r.name === hover)!.score.toFixed(2)}
            </span>
            <span className="kin-readout-l">similarity · {rows.find((r) => r.name === hover)!.category}</span>
          </>
        ) : (
          <span className="kin-readout-hint">hover to read a score</span>
        )}
      </div>
    </div>
  );
}

export function Divergence({
  id,
  rows,
  onPick,
}: {
  id: string;
  rows: DivergenceRow[];
  onPick: (name: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = useReveal(id);
  const tip = useCartouche();
  const H = 132;
  const TOP = 16;
  const BOT = H - 20;
  const LX = 62;
  const RX = 180;

  const y = (v: number) => BOT - Math.max(0, Math.min(1, v)) * (BOT - TOP);

  return (
    <div className="dvg">
      <svg className="dvg-svg" viewBox={`0 0 ${VIEW_W} ${H}`} role="img"
           aria-label="Effect similarity versus target similarity">
        <line className="dvg-rail" x1={LX} y1={TOP} x2={LX} y2={BOT} />
        <line className="dvg-rail" x1={RX} y1={TOP} x2={RX} y2={BOT} />
        <text className="dvg-rail-label" x={LX} y={BOT + 13} textAnchor="middle">feels</text>
        <text className="dvg-rail-label" x={RX} y={BOT + 13} textAnchor="middle">binds</text>

        {rows.map((d, i) => {
          const y1 = y(d.effect_sim);
          const y2 = y(d.target_sim);
          const on = hover === d.name;
          const hue = d.divergence > 0 ? "var(--psychedelic)" : "var(--dissociatives)";
          return (
            <g
              key={d.name}
              className={`dvg-g${on ? " on" : ""}${shown ? " in" : ""}`}
              style={{ transitionDelay: `${i * 60}ms` }}
              onMouseEnter={(e) => {
                setHover(d.name);
                tip.show(e, {
                  title: d.name,
                  subtitle: d.divergence > 0 ? "feels alike · binds apart" : "binds alike · feels apart",
                  accent: hue,
                  rows: [
                    { label: "feels alike", value: d.effect_sim.toFixed(2), bar: d.effect_sim, hue: "var(--psychedelic)" },
                    { label: "binds alike", value: d.target_sim.toFixed(2), bar: d.target_sim, hue: "var(--dissociatives)" },
                  ],
                  note: `The two measures disagree by ${Math.abs(d.divergence).toFixed(2)}.`,
                });
              }}
              onMouseMove={tip.move}
              onMouseLeave={() => {
                setHover(null);
                tip.hide();
              }}
              onClick={() => onPick(d.name)}
            >
              <line className="dvg-hit" x1={LX} y1={y1} x2={RX} y2={y2} />
              <line className="dvg-line" x1={LX} y1={y1} x2={RX} y2={y2} style={{ stroke: hue }} />
              <circle className="dvg-end" cx={LX} cy={y1} r={3} style={{ fill: hue }} />
              <circle className="dvg-end" cx={RX} cy={y2} r={3} style={{ fill: hue }} />
              <text className="dvg-name" x={LX - 7} y={y1} textAnchor="end" dy="0.32em">{d.name}</text>
            </g>
          );
        })}
      </svg>
      <p className="dvg-key">
        A line that <em>falls</em> feels alike but binds differently; one that <em>climbs</em> binds
        alike but feels different.
      </p>
    </div>
  );
}
