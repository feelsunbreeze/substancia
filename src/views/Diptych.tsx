import { useEffect, useMemo, useState } from "react";
import { getSubstance, search, compareNeuro, topDivergent, atlasIndex, Substance, SearchHit, NeuroCompare, DivergentPair, AtlasNode, pigment, Range } from "../lib/api";
import { useRouter } from "../lib/router";
import DoseArc from "../components/DoseArc";
import { NeuroCompareBars } from "../components/NeuroBars";
import "./Diptych.css";

function Picker({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string | undefined;
  onPick: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    let alive = true;
    if (!query.trim()) {
      setHits([]);
      return;
    }
    search(query).then((r) => {
      if (alive) setHits(r.filter((h) => h.kind === "substance" && h.mapped));
    });
    return () => {
      alive = false;
    };
  }, [query]);

  if (value) {
    return (
      <div className="picker picked">
        <span className="picker-label">{label}</span>
        <span className="picker-value">{value}</span>
        <button className="picker-clear" onClick={() => onPick("")}>
          change
        </button>
      </div>
    );
  }

  return (
    <div className="picker">
      <span className="picker-label">{label}</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="name a specimen…"
        spellCheck={false}
        autoFocus
      />
      {hits.length > 0 && (
        <ul className="picker-hits">
          {hits.map((h) => (
            <li key={h.name}>
              <button onClick={() => onPick(h.name)}>
                <span className="hit-dot" style={{ background: pigment(h.category) }} />
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Openings({ onPick }: { onPick: (a: string, b: string) => void }) {
  const [pairs, setPairs] = useState<DivergentPair[]>([]);
  const [index, setIndex] = useState<Map<string, AtlasNode> | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    topDivergent().then((p) => setPairs(p.slice(0, 6)));
    atlasIndex().then(setIndex);
    const t = window.setTimeout(() => setShown(true), 140);
    return () => window.clearTimeout(t);
  }, []);

  if (pairs.length === 0) return null;

  const pig = (name: string) => pigment(index?.get(name)?.category ?? "Uncategorized");

  return (
    <section className="openings">
      <div className="openings-head">
        <span className="openings-label">where the codex disagrees with itself</span>
        <span className="openings-note">
          pairs that feel alike but bind differently — or the reverse
        </span>
      </div>

      <div className="openings-grid">
        {pairs.map((p, i) => {
          const feelsLed = p.direction === "feels-alike-binds-different";
          const y = (v: number) => 30 - Math.max(0, Math.min(1, v)) * 22;
          return (
            <button
              key={`${p.a}-${p.b}`}
              className={`opening${shown ? " in" : ""}`}
              style={{ transitionDelay: `${i * 60}ms` }}
              onClick={() => onPick(p.a, p.b)}
            >
              <span className="opening-names">
                <span className="opening-n" style={{ color: pig(p.a) }}>{p.a}</span>
                <span className="opening-x">/</span>
                <span className="opening-n" style={{ color: pig(p.b) }}>{p.b}</span>
              </span>

              <svg className="opening-slope" viewBox="0 0 74 36" aria-hidden="true">
                <line className="op-rail" x1="10" y1="6" x2="10" y2="30" />
                <line className="op-rail" x1="64" y1="6" x2="64" y2="30" />
                <line
                  className="op-line"
                  x1="10" y1={y(p.effect_sim)} x2="64" y2={y(p.target_sim)}
                  style={{ stroke: feelsLed ? "var(--psychedelic)" : "var(--dissociatives)" }}
                />
                <circle cx="10" cy={y(p.effect_sim)} r="2.4"
                        style={{ fill: feelsLed ? "var(--psychedelic)" : "var(--dissociatives)" }} />
                <circle cx="64" cy={y(p.target_sim)} r="2.4"
                        style={{ fill: feelsLed ? "var(--psychedelic)" : "var(--dissociatives)" }} />
              </svg>

              <span className="opening-read">
                {feelsLed ? "feels alike · binds apart" : "binds alike · feels apart"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function fmtRange(r: Range | null | undefined): string | null {
  if (!r) return null;
  if (r.min != null && r.max != null) return `${r.min}–${r.max}`;
  if (r.min != null) return `${r.min}`;
  if (r.max != null) return `${r.max}`;
  return null;
}

function effectNames(sub: Substance): Set<string> {
  const s = new Set<string>();
  for (const items of Object.values(sub.subjective_effects)) {
    for (const it of items) s.add(it.name);
  }
  return s;
}

export default function Diptych({ a: initA, b: initB }: { a?: string; b?: string }) {
  const [aName, setAName] = useState(initA ?? "");
  const [bName, setBName] = useState(initB ?? "");
  const [a, setA] = useState<Substance | null>(null);
  const [b, setB] = useState<Substance | null>(null);
  const [neuro, setNeuro] = useState<NeuroCompare | null>(null);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    if (aName) getSubstance(aName).then(setA);
    else setA(null);
  }, [aName]);
  useEffect(() => {
    if (bName) getSubstance(bName).then(setB);
    else setB(null);
  }, [bName]);

  useEffect(() => {
    if (aName && bName) compareNeuro(aName, bName).then(setNeuro);
    else setNeuro(null);
  }, [aName, bName]);

  useEffect(() => {
    if ((aName && a === undefined) || (bName && b === undefined)) return;
    restoreScroll();
  }, [aName, bName, a, b, restoreScroll]);

  const closeness = useMemo(() => {
    if (!a || !b) return null;
    const found = a.atlas?.neighbors.find((n) => n.name === b.name);
    if (found) return found.score;
    const foundB = b.atlas?.neighbors.find((n) => n.name === a.name);
    return foundB ? foundB.score : null;
  }, [a, b]);

  const overlap = useMemo(() => {
    if (!a || !b) return null;
    const ea = effectNames(a);
    const eb = effectNames(b);
    const shared = [...ea].filter((e) => eb.has(e)).sort();
    const onlyA = [...ea].filter((e) => !eb.has(e)).sort();
    const onlyB = [...eb].filter((e) => !ea.has(e)).sort();
    return { shared, onlyA, onlyB };
  }, [a, b]);

  if (!a || !b) {
    return (
      <div className="diptych-setup">
        <div className="eyebrow">Room VII · The Diptych</div>
        <h1 className="dip-title">Hold two plates to the light</h1>
        <p className="dip-lede">
          Set any two specimens side by side — their dosing, their arc, the effects they share and
          the ones only one of them causes, and how far their receptor profiles agree.
        </p>

        <div className="picker-row">
          <Picker label="First" value={a?.name} onPick={setAName} />
          <span className="picker-vs">against</span>
          <Picker label="Second" value={b?.name} onPick={setBName} />
        </div>

        <Openings
          onPick={(x, y) => { setAName(x); setBName(y); }}
        />
      </div>
    );
  }

  const pigA = pigment(a.class?.psychoactive?.[0] ?? "Uncategorized");
  const pigB = pigment(b.class?.psychoactive?.[0] ?? "Uncategorized");
  const roaA = a.roas?.[0];
  const roaB = b.roas?.[0];

  return (
    <article className="diptych">
      <header className="dip-header">
        <button className="dip-name-btn" style={{ color: pigA }} onClick={() => navigate({ view: "specimen", name: a.name })}>
          {a.name}
        </button>
        <div className="dip-vs">
          {closeness != null ? (
            <>
              <div className="dip-closeness">{Math.round(closeness * 100)}</div>
              <div className="dip-closeness-label">feel-alike</div>
            </>
          ) : (
            <div className="dip-closeness-label">not adjacent in the sky</div>
          )}
        </div>
        <button className="dip-name-btn right" style={{ color: pigB }} onClick={() => navigate({ view: "specimen", name: b.name })}>
          {b.name}
        </button>
      </header>

      <section className="dip-row">
        <h3 className="dip-row-title">Dose</h3>
        <div className="dip-cols">
          <div className="dip-col">
            {roaA?.dose ? (
              <table className="dip-dose">
                <tbody>
                  <tr><td>threshold</td><td>{roaA.dose.threshold ?? "—"}{roaA.dose.units}</td></tr>
                  <tr><td>common</td><td>{fmtRange(roaA.dose.common) ?? "—"}{roaA.dose.units}</td></tr>
                  <tr><td>strong</td><td>{fmtRange(roaA.dose.strong) ?? "—"}{roaA.dose.units}</td></tr>
                </tbody>
              </table>
            ) : (
              <p className="dip-empty">no dose recorded</p>
            )}
          </div>
          <div className="dip-col">
            {roaB?.dose ? (
              <table className="dip-dose">
                <tbody>
                  <tr><td>threshold</td><td>{roaB.dose.threshold ?? "—"}{roaB.dose.units}</td></tr>
                  <tr><td>common</td><td>{fmtRange(roaB.dose.common) ?? "—"}{roaB.dose.units}</td></tr>
                  <tr><td>strong</td><td>{fmtRange(roaB.dose.strong) ?? "—"}{roaB.dose.units}</td></tr>
                </tbody>
              </table>
            ) : (
              <p className="dip-empty">no dose recorded</p>
            )}
          </div>
        </div>
      </section>

      <section className="dip-row">
        <h3 className="dip-row-title">The Arc</h3>
        <div className="dip-cols">
          <div className="dip-col">{roaA?.duration ? <DoseArc key={a.name} duration={roaA.duration} color={pigA} /> : <p className="dip-empty">no timing recorded</p>}</div>
          <div className="dip-col">{roaB?.duration ? <DoseArc key={b.name} duration={roaB.duration} color={pigB} /> : <p className="dip-empty">no timing recorded</p>}</div>
        </div>
      </section>

      {overlap && (
        <section className="dip-row">
          <h3 className="dip-row-title">Phenomenology</h3>
          <div className="dip-effect-cols">
            <div className="dip-effect-col">
              <div className="dip-effect-label" style={{ color: pigA }}>only {a.name}</div>
              <ul>{overlap.onlyA.slice(0, 14).map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
            <div className="dip-effect-col shared">
              <div className="dip-effect-label">shared &middot; {overlap.shared.length}</div>
              <ul>{overlap.shared.slice(0, 14).map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
            <div className="dip-effect-col">
              <div className="dip-effect-label" style={{ color: pigB }}>only {b.name}</div>
              <ul>{overlap.onlyB.slice(0, 14).map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      {neuro && neuro.systems.length > 0 && (
        <section className="dip-row">
          <h3 className="dip-row-title">
            Neurochemistry
            <span className="dip-row-sub">&middot; {Math.round(neuro.similarity * 100)}% aligned</span>
          </h3>
          <NeuroCompareBars rows={neuro.systems} nameA={a.name} nameB={b.name} />
        </section>
      )}

      <button className="dip-restart" onClick={() => { setAName(""); setBName(""); }}>
        compare different specimens
      </button>
    </article>
  );
}
