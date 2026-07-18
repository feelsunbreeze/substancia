import { useEffect, useState } from "react";
import { getCategory, Category as CategoryT, CategoryKind, pigment } from "../lib/api";
import { useRouter } from "../lib/router";
import Prose from "../components/Prose";
import { IconConfluence, IconChemistry, IconPharmacology } from "../lib/icons";
import "./Category.css";

const KIND_LABEL: Record<CategoryKind, string> = {
  psychoactive: "Psychoactive class",
  chemical: "Chemical class",
  mechanism: "Mechanism group",
};
const KIND_ICON: Record<CategoryKind, typeof IconConfluence> = {
  psychoactive: IconConfluence,
  chemical: IconChemistry,
  mechanism: IconPharmacology,
};

export default function Category({ name }: { name: string }) {
  const [cat, setCat] = useState<CategoryT | null | undefined>(undefined);
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    setCat(undefined);
    getCategory(name).then(setCat);
  }, [name]);

  useEffect(() => {
    if (cat !== undefined) restoreScroll();
  }, [cat, restoreScroll]);

  if (cat === undefined) return <div className="specimen-loading">gathering the class…</div>;
  if (cat === null)
    return <div className="specimen-loading"><em>{name}</em> is referenced but has no class page yet.</div>;

  // group members by psychoactive class
  const groups = new Map<string, typeof cat.members>();
  for (const m of cat.members) {
    if (!groups.has(m.category)) groups.set(m.category, []);
    groups.get(m.category)!.push(m);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const KindIcon = KIND_ICON[cat.kind];

  return (
    <article className="cat">
      <header className="cat-header">
        <div className={`cat-badge kind-${cat.kind}`}>
          <KindIcon size={20} />
          <span>{KIND_LABEL[cat.kind]}</span>
        </div>
        <h1 className="cat-name">{cat.name}</h1>
        {cat.aliases.length > 0 && (
          <div className="cat-aliases">
            also: {[...new Set(cat.aliases.map((a) => a.toUpperCase()))].slice(0, 5).join(" · ")}
          </div>
        )}
      </header>

      <div className="cat-body">
        <main className="cat-column">
          {cat.blocks.length > 0 ? (
            <Prose blocks={cat.blocks} dropcap />
          ) : (
            <p className="cat-nodesc">No class description recorded yet.</p>
          )}
          {cat.url && (
            <a className="cat-source" href={cat.url} target="_blank" rel="noreferrer">
              read the full class entry on PsychonautWiki ▸
            </a>
          )}
        </main>

        <aside className="cat-members">
          <h3>
            <span className="cat-count">{cat.members.length}</span> in the codex
          </h3>
          {ordered.map(([category, members]) => (
            <div key={category} className="cat-group">
              <div className="cat-group-label" style={{ color: pigment(category) }}>
                <span className="pigment-dot" style={{ background: pigment(category) }} />
                {category}
              </div>
              <div className="cat-chips">
                {members.map((m) => (
                  <button
                    key={m.name}
                    className="cat-chip"
                    onClick={() => navigate({ view: "specimen", name: m.name })}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </article>
  );
}
