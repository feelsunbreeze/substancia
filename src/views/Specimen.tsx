import { useEffect, useRef, useState } from "react";
import { getSubstance, getNeuro, getBipartite, makeResolver, getAtlas, atlasIndex, Substance, NeuroProfile, BipartiteProfile, AtlasNode, EffectAxes, Range, Reference, pigment } from "../lib/api";
import { Signature, Kinship, Divergence, KinRow } from "../components/Sigils";
import { useRouter, Route } from "../lib/router";
import { recordVisit } from "../lib/traversal";
import { useEdgeFade } from "../lib/useEdgeFade";
import DoseArc from "../components/DoseArc";
import Prose, { RefName } from "../components/Prose";
import { NeuroBars } from "../components/NeuroBars";
import { PROSE_ICONS, PHENOMENOLOGY_ICONS, IconPhenomenology, IconLegal, IconHazard } from "../lib/icons";
import "./Specimen.css";

const PROSE_ORDER = [
  "History and culture",
  "Chemistry",
  "Pharmacology",
  "Forms",
  "Research",
  "Toxicity and harm potential",
];
const LEGAL_SECTION = "Legal status";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function fmtRange(r: Range | null | undefined, units?: string | null): string | null {
  if (!r) return null;
  const u = units ?? r.units ?? "";
  if (r.min != null && r.max != null) return `${r.min}–${r.max}${u}`;
  if (r.min != null) return `${r.min}${u}`;
  if (r.max != null) return `${r.max}${u}`;
  return null;
}

export default function Specimen({ name }: { name: string }) {
  const [sub, setSub] = useState<Substance | null | undefined>(undefined);
  const [neuro, setNeuro] = useState<NeuroProfile | null>(null);
  const [bipartite, setBipartite] = useState<BipartiteProfile | null>(null);
  const [resolve, setResolve] = useState<(n: string) => Reference>(() => (n: string) => ({ kind: "none" as const, name: n }));
  const [showSticky, setShowSticky] = useState(false);
  const [kin, setKin] = useState<Map<string, AtlasNode> | null>(null);
  const [axes, setAxes] = useState<EffectAxes | null>(null);
  const vitalsFade = useEdgeFade<HTMLElement>();
  const refsFade = useEdgeFade<HTMLElement>();
  const nameRef = useRef<HTMLHeadingElement | null>(null);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    setSub(undefined);
    setNeuro(null);
    setBipartite(null);
    getSubstance(name).then((s) => {
      setSub(s);
      if (s) recordVisit(name);
    });
    getNeuro(name).then(setNeuro);
    getBipartite(name).then(setBipartite);
  }, [name]);

  useEffect(() => {
    if (sub !== undefined) restoreScroll();
  }, [sub, restoreScroll]);

  useEffect(() => {
    makeResolver().then((fn) => setResolve(() => fn));
  }, []);

  useEffect(() => {
    atlasIndex().then(setKin);
    getAtlas().then((a) => setAxes(a.effect_axes));
  }, []);

  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: "-40px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sub]);

  if (sub === undefined) return <div className="specimen-loading">unfolding the plate…</div>;
  if (sub === null)
    return (
      <div className="specimen-loading">
        <em>{name}</em> is named in the codex but has no plate of its own yet.
      </div>
    );

  const category = sub.class?.psychoactive?.[0] ?? "Uncategorized";
  const subcategory = sub.class?.chemical?.[0] ?? "Unclassified";
  const pig = pigment(category);
  const roa = sub.roas?.[0];
  const neighbors = sub.atlas?.neighbors ?? [];
  const signature = sub.atlas?.signature_effects ?? [];

  const goTo = (n: string) => navigate({ view: "specimen", name: n });
  const goToEffect = (n: string) => navigate({ view: "effect", name: n });
  const compare = () => navigate({ view: "diptych", a: sub.name });
  const onNavigate = (ref: Reference) =>
    navigate({ view: ref.kind === "category" ? "category" : "specimen", name: ref.name } as Route);

  const toKinRows = (list: { name: string; score: number }[]): KinRow[] =>
    list.map((n) => {
      const node = kin?.get(n.name);
      return {
        name: n.name,
        score: n.score,
        category: node?.category ?? "Uncategorized",
        effectCount: node?.effect_count ?? 0,
      };
    });

  const feelsRows = toKinRows(neighbors.slice(0, 6));
  const bindsRows = toKinRows(bipartite?.target_neighbors.slice(0, 5) ?? []);

  const allScores = [...feelsRows, ...bindsRows].map((r) => r.score);
  const kinDomain: [number, number] = allScores.length
    ? [Math.min(...allScores), Math.max(...allScores)]
    : [0, 1];

  const interactionGroups: [string, { name: string }[] | null | undefined, string][] = [
    ["Dangerous", sub.dangerousInteractions, "var(--danger)"],
    ["Unsafe", sub.unsafeInteractions, "var(--warn)"],
    ["Uncertain", sub.uncertainInteractions, "var(--uncertain)"],
  ];

  return (
    <article className="specimen" style={{ ["--pig" as any]: pig }}>
      <div className={`sp-sticky ${showSticky ? "on" : ""}`}>
        <span className="pigment-dot" style={{ background: pig }} />
        <span className="sp-sticky-name">{sub.name}</span>
        <span className="sp-sticky-class">{category}</span>
      </div>

      <header className="sp-header">
        <div className="sp-rule" style={{ background: pig }} />
        <div className="sp-heading">
          <div className="sp-class-line" style={{ color: pig }}>
            <span className="pigment-dot" style={{ background: pig }} />
            {category === "Uncategorized" ? (
              <span>{category}</span>
            ) : (
              <RefName subject={category} className="class-line-ref" resolve={resolve} onNavigate={onNavigate} />
            )}
            {" · "}
            {subcategory === "Unclassified" ? (
              <span>{subcategory}</span>
            ) : (
              <RefName subject={subcategory} className="class-line-ref" resolve={resolve} onNavigate={onNavigate} />
            )}
          </div>
          <h1 className="sp-name" ref={nameRef}>{sub.name}</h1>
          {sub.commonNames && sub.commonNames.length > 1 && (
            <div className="sp-aka">{sub.commonNames.filter((c) => c !== sub.name).slice(0, 8).join(" · ")}</div>
          )}
          {sub.systematicName && <div className="sp-systematic">{sub.systematicName}</div>}
        </div>
        <button className="sp-compare" onClick={compare} style={{ borderColor: pig }}>
          compare ▸
        </button>
      </header>

      <div className="sp-body">
        <aside className={`sp-vitals ${vitalsFade.className}`} ref={vitalsFade.ref}>
          {roa?.dose && (
            <section className="vital">
              <h3>Dose</h3>
              <div className="vital-roa">{roa.name ?? "—"} · {roa.dose.units ?? ""}</div>
              <table className="dose-table">
                <tbody>
                  {roa.dose.threshold != null && (
                    <tr><td>threshold</td><td>{roa.dose.threshold}{roa.dose.units}</td></tr>
                  )}
                  {fmtRange(roa.dose.light, roa.dose.units) && (
                    <tr><td>light</td><td>{fmtRange(roa.dose.light, roa.dose.units)}</td></tr>
                  )}
                  {fmtRange(roa.dose.common, roa.dose.units) && (
                    <tr><td>common</td><td>{fmtRange(roa.dose.common, roa.dose.units)}</td></tr>
                  )}
                  {fmtRange(roa.dose.strong, roa.dose.units) && (
                    <tr><td>strong</td><td>{fmtRange(roa.dose.strong, roa.dose.units)}</td></tr>
                  )}
                  {roa.dose.heavy != null && (
                    <tr><td>heavy</td><td>{roa.dose.heavy}{roa.dose.units}+</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {roa?.duration && (
            <section className="vital">
              <h3>The Arc</h3>
              <DoseArc key={sub.name} duration={roa.duration} color={pig} />
            </section>
          )}

          {sub.tolerance && (sub.tolerance.full || sub.tolerance.zero) && (
            <section className="vital">
              <h3>Tolerance</h3>
              <dl className="vital-dl">
                {sub.tolerance.full && (<><dt>full</dt><dd>{sub.tolerance.full}</dd></>)}
                {sub.tolerance.half && (<><dt>half</dt><dd>{sub.tolerance.half}</dd></>)}
                {sub.tolerance.zero && (<><dt>baseline</dt><dd>{sub.tolerance.zero}</dd></>)}
              </dl>
            </section>
          )}

          {sub.addictionPotential && (
            <section className="vital">
              <h3>Addiction</h3>
              <p className="vital-note">{sub.addictionPotential}</p>
            </section>
          )}

          {sub.crossTolerances && sub.crossTolerances.length > 0 && (
            <section className="vital">
              <h3>Cross-tolerance</h3>
              <p className="vital-note">{sub.crossTolerances.join(", ")}</p>
            </section>
          )}

          {neuro && Object.keys(neuro.systems).length > 0 && (
            <section className="vital">
              <h3>Neurochemistry</h3>
              <NeuroBars systems={neuro.systems} />
            </section>
          )}
        </aside>

        <main className="sp-column">
          {sub.summary && (
            sub.summaryHazard ? (
              <div className="sp-hazard">
                <IconHazard size={22} className="sp-hazard-icon" />
                <p className="sp-hazard-text">{sub.summary}</p>
              </div>
            ) : (
              <p className="sp-summary">{sub.summary}</p>
            )
          )}

          {PROSE_ORDER.filter((s) => sub.prose[s]?.length).map((section, i) => {
            const Icon = PROSE_ICONS[section];
            const isDangerous = sub.prose[section].some((b) => b.type === "callout" && b.level === "dangerous");
            return (
              <section key={section} className={`prose-section ${isDangerous ? "hazardous" : ""}`}>
                <h2 className="prose-h">
                  <span className="prose-numeral" aria-hidden="true">{ROMAN[i] ?? i + 1}</span>
                  {isDangerous ? <IconHazard size={26} className="prose-icon hazard" /> : Icon && <Icon size={30} className="prose-icon" />}
                  {section}
                </h2>
                <Prose blocks={sub.prose[section]} dropcap={i === 0} incipit resolve={resolve} onNavigate={onNavigate} />
              </section>
            );
          })}

          {Object.keys(sub.subjective_effects).length > 0 && (
            <section className="prose-section phenomenology">
              <h2 className="prose-h">
                <IconPhenomenology size={30} className="prose-icon" />
                Phenomenology
              </h2>
              {Object.entries(sub.subjective_effects).map(([cat, items]) => {
                const CatIcon = PHENOMENOLOGY_ICONS[cat];
                return (
                  <div key={cat} className="phen-group">
                    <h3 className="phen-cat">
                      {CatIcon && <CatIcon size={19} className="phen-icon" />}
                      {cat}
                    </h3>
                    <ul className="phen-list">
                      {items.map((it, k) => (
                        <li key={k}>
                          <button className="phen-name" onClick={() => goToEffect(it.name)}>{it.name}</button>
                          {it.description && <span className="phen-desc"> — {it.description}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}

          {!!sub.prose[LEGAL_SECTION]?.length && (
            <section className="prose-section prose-legal">
              <h2 className="prose-h">
                <IconLegal size={30} className="prose-icon" />
                {LEGAL_SECTION}
              </h2>
              <Prose blocks={sub.prose[LEGAL_SECTION]} resolve={resolve} onNavigate={onNavigate} />
            </section>
          )}
        </main>

        <aside className={`sp-refs ${refsFade.className}`} ref={refsFade.ref}>
          <section className="ref">
            <h3>Signature <span className="ref-h-note">shape of the experience</span></h3>
            <Signature
              name={sub.name}
              sections={sub.subjective_effects}
              category={category}
              effects={signature}
              axes={axes}
              onEffect={goToEffect}
            />
          </section>

          {feelsRows.length > 0 && (
            <section className="ref">
              <h3>Nearest kin <span className="ref-h-note">feels alike</span></h3>
              <Kinship id={`feels-${sub.name}`} rows={feelsRows} domain={kinDomain} onPick={goTo} />
            </section>
          )}

          {bindsRows.length > 0 && (
            <section className="ref">
              <h3>Binds like <span className="ref-h-note">same targets</span></h3>
              <Kinship id={`binds-${sub.name}`} rows={bindsRows} domain={kinDomain} onPick={goTo} />
            </section>
          )}

          {bipartite && bipartite.divergence.length > 0 && (
            <section className="ref">
              <h3>Divergence <span className="ref-h-note">where the two disagree</span></h3>
              <Divergence id={`dvg-${sub.name}`} rows={bipartite.divergence.slice(0, 5)} onPick={goTo} />
            </section>
          )}

          {interactionGroups.some(([, items]) => items && items.length > 0) && (
            <section className="ref">
              <h3>Confluence</h3>
              {interactionGroups.map(([label, items, color]) =>
                items && items.length > 0 ? (
                  <div key={label} className="ixn-group">
                    <div className="ixn-label" style={{ color }}>{label}</div>
                    <div className="ixn-names">
                      {items.map((it, i) => (
                        <span key={it.name}>
                          <RefName subject={it.name} resolve={resolve} onNavigate={onNavigate} />
                          {i < items.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
