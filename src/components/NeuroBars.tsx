import "./NeuroBars.css";

const SYSTEM_LABEL: Record<string, string> = {
  serotonin: "Serotonin",
  dopamine: "Dopamine",
  norepinephrine: "Norepinephrine",
  gaba: "GABA",
  glutamate: "Glutamate",
  opioid: "Opioid",
  cannabinoid: "Cannabinoid",
  histamine: "Histamine",
  acetylcholine: "Acetylcholine",
  "trace amine": "Trace amine",
  sigma: "Sigma",
};

function label(system: string): string {
  return SYSTEM_LABEL[system] ?? system[0].toUpperCase() + system.slice(1);
}

export function NeuroBars({ systems }: { systems: Record<string, number> }) {
  const rows = Object.entries(systems).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (rows.length === 0) return null;
  return (
    <div className="neuro-bars">
      {rows.map(([system, score]) => (
        <div key={system} className="neuro-row">
          <span className="neuro-label">{label(system)}</span>
          <div className="neuro-track">
            <div className="neuro-mid" />
            <div
              className={`neuro-fill ${score >= 0 ? "pos" : "neg"}`}
              style={{ width: `${Math.abs(score) * 50}%`, [score >= 0 ? "left" : "right"]: "50%" } as any}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NeuroCompareBars({
  rows,
  nameA,
  nameB,
}: {
  rows: { system: string; a: number; b: number }[];
  nameA: string;
  nameB: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="neuro-compare">
      <div className="neuro-compare-heads">
        <span>{nameA}</span>
        <span>{nameB}</span>
      </div>
      {rows.map((r) => (
        <div key={r.system} className="neuro-cmp-row">
          <div className="neuro-cmp-side left">
            <div className="neuro-cmp-track">
              <div
                className={`neuro-fill ${r.a >= 0 ? "pos" : "neg"}`}
                style={{ width: `${Math.abs(r.a) * 100}%` }}
              />
            </div>
          </div>
          <span className="neuro-cmp-label">{label(r.system)}</span>
          <div className="neuro-cmp-side right">
            <div className="neuro-cmp-track">
              <div
                className={`neuro-fill ${r.b >= 0 ? "pos" : "neg"}`}
                style={{ width: `${Math.abs(r.b) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
