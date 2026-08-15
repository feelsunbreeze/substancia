import { useEffect, useState } from "react";
import { getEffect, Effect as EffectT, Block, pigment } from "../lib/api";
import { useRouter } from "../lib/router";
import Prose from "../components/Prose";
import "./Effect.css";

function withoutSubstanceList(blocks: Block[]): Block[] {
  const out: Block[] = [];
  let skipping = false;
  for (const b of blocks) {
    if (b.type === "h3" && /psychoactive substances/i.test(b.text)) {
      skipping = true;
      continue;
    }
    if (skipping && b.type === "h3") skipping = false;
    if (!skipping) out.push(b);
  }
  return out;
}

export default function Effect({ name }: { name: string }) {
  const [effect, setEffect] = useState<EffectT | null | undefined>(undefined);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    setEffect(undefined);
    getEffect(name).then(setEffect);
  }, [name]);

  useEffect(() => {
    if (effect !== undefined) restoreScroll();
  }, [effect, restoreScroll]);

  if (effect === undefined) return <div className="specimen-loading">unfolding the entry…</div>;
  if (effect === null)
    return (
      <div className="specimen-loading">
        <em>{name}</em> is referenced in the codex but has no entry of its own yet.
      </div>
    );

  const groups = new Map<string, typeof effect.substances>();
  for (const link of effect.substances) {
    if (!groups.has(link.category)) groups.set(link.category, []);
    groups.get(link.category)!.push(link);
  }
  const orderedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const description = withoutSubstanceList(effect.description);

  return (
    <article className="fx">
      <header className="fx-header">
        <div className="fx-rule" />
        <div>
          <div className="eyebrow fx-eyebrow">
            {effect.category ?? "Subjective Effect Index"} {effect.subcategory ? `· ${effect.subcategory}` : ""}
          </div>
          <h1 className="fx-name">{effect.name}</h1>
        </div>
      </header>

      <div className="fx-body">
        <main className="fx-column">
          {description.length > 0 ? (
            <Prose blocks={description} dropcap />
          ) : (
            <p className="fx-no-desc">No canonical description recorded yet for this effect.</p>
          )}
          {effect.url && (
            <a className="fx-source" href={effect.url} target="_blank" rel="noreferrer">
              read the full entry on PsychonautWiki ▸
            </a>
          )}
        </main>

        <aside className="fx-refs">
          <h3>
            Induced by <span className="fx-count">{effect.substances.length}</span> specimens
          </h3>
          {orderedGroups.length === 0 && <p className="fx-no-desc">No substances linked yet.</p>}
          {orderedGroups.map(([category, links]) => (
            <div key={category} className="fx-group">
              <div className="fx-group-label" style={{ color: pigment(category) }}>
                <span className="pigment-dot" style={{ background: pigment(category) }} />
                {category}
              </div>
              <ul className="fx-sub-list">
                {links
                  .sort((a, b) => a.substance.localeCompare(b.substance))
                  .map((l) => (
                    <li key={l.substance}>
                      <button className="ref-link" onClick={() => navigate({ view: "specimen", name: l.substance })}>
                        {l.substance}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </aside>
      </div>
    </article>
  );
}
