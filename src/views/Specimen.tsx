import { useEffect, useRef, useState } from "react";
import { getSubstance, getNeuro, getBipartite, makeResolver, Substance, NeuroProfile, BipartiteProfile, Range, Reference, pigment } from "../lib/api";
import { useRouter, Route } from "../lib/router";
import DoseArc from "../components/DoseArc";
import Prose, { RefName } from "../components/Prose";
import { NeuroBars } from "../components/NeuroBars";
import { PROSE_ICONS, PHENOMENOLOGY_ICONS, IconPhenomenology, IconLegal, IconHazard } from "../lib/icons";
import "./Specimen.css";

// Legal status always closes the plate, regardless of what the wiki source
// ordering was — everything else keeps its natural reading order.
const PROSE_ORDER = [
  "History and culture",
  "Chemistry",
  "Pharmacology",
  "Forms",
  "Research",
  "Toxicity and harm potential",
];
const LEGAL_SECTION = "Legal status";

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
  const nameRef = useRef<HTMLHeadingElement | null>(null);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    setSub(undefined);
    setNeuro(null);
    setBipartite(null);
    getSubstance(name).then((s) => setSub(s));
    getNeuro(name).then(setNeuro);
    getBipartite(name).then(setBipartite);
  }, [name]);

  useEffect(() => {
    if (sub !== undefined) restoreScroll();
  }, [sub, restoreScroll]);

  useEffect(() => {
    makeResolver().then((fn) => setResolve(() => fn));
  }, []);

  // reveal a subtle sticky title once the big name scrolls out of view
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

  const interactionGroups: [string, { name: string }[] | null | undefined, string][] = [
    ["Dangerous", sub.dangerousInteractions, "var(--danger)"],
    ["Unsafe", sub.unsafeInteractions, "var(--warn)"],
    ["Uncertain", sub.uncertainInteractions, "var(--uncertain)"],
  ];

  return (
    <article className="specimen" style={{ ["--pig" as any]: pig }}>
      {/* subtle sticky title once the masthead scrolls away */}
      <div className={`sp-sticky ${showSticky ? "on" : ""}`}>
        <span className="pigment-dot" style={{ background: pig }} />
        <span className="sp-sticky-name">{sub.name}</span>
        <span className="sp-sticky-class">{category}</span>
      </div>

      {/* ——— header ——— */}
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

      {/* ——— three-column codex body ——— */}
      <div className="sp-body">
        {/* LEFT MARGIN — vitals */}
        <aside className="sp-vitals">
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

        {/* CENTER — the illuminated text */}
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
                  {isDangerous ? <IconHazard size={26} className="prose-icon hazard" /> : Icon && <Icon size={30} className="prose-icon" />}
                  {section}
                </h2>
                <Prose blocks={sub.prose[section]} dropcap={i === 0} resolve={resolve} onNavigate={onNavigate} />
              </section>
            );
          })}

          {/* structured phenomenology */}
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

          {/* legal status always closes the plate */}
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

        {/* RIGHT MARGIN — living cross-references */}
        <aside className="sp-refs">
          {signature.length > 0 && (
            <section className="ref">
              <h3>Signature</h3>
              <div className="sig-chips">
                {signature.map((e) => (
                  <button key={e} className="sig-chip" onClick={() => goToEffect(e)}>{e}</button>
                ))}
              </div>
            </section>
          )}

          {neighbors.length > 0 && (
            <section className="ref">
              <h3>Nearest kin <span className="ref-h-note">feels alike</span></h3>
              <ul className="ref-list">
                {neighbors.slice(0, 6).map((n) => (
                  <li key={n.name} className="ref-row">
                    <button className="ref-link" onClick={() => goTo(n.name)}>{n.name}</button>
                    <span className="ref-meter"><span className="ref-meter-fill" style={{ width: `${Math.round(n.score * 100)}%` }} /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bipartite && bipartite.target_neighbors.length > 0 && (
            <section className="ref">
              <h3>Binds like <span className="ref-h-note">same targets</span></h3>
              <ul className="ref-list">
                {bipartite.target_neighbors.slice(0, 5).map((n) => (
                  <li key={n.name} className="ref-row">
                    <button className="ref-link" onClick={() => goTo(n.name)}>{n.name}</button>
                    <span className="ref-meter"><span className="ref-meter-fill" style={{ width: `${Math.round(n.score * 100)}%` }} /></span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bipartite && bipartite.divergence.length > 0 && (
            <section className="ref">
              <h3>Divergence</h3>
              <ul className="ref-list">
                {bipartite.divergence.slice(0, 4).map((d) => (
                  <li key={d.name} className="ref-row">
                    <button className="ref-link" onClick={() => goTo(d.name)}>{d.name}</button>
                    <span className={`ref-tag ${d.divergence > 0 ? "feels" : "binds"}`} title="feels-alike vs binds-alike">
                      {d.divergence > 0 ? "feels≠binds" : "binds≠feels"}
                    </span>
                  </li>
                ))}
              </ul>
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
