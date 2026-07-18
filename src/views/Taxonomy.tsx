import { useEffect, useMemo, useState } from "react";
import { listCategories, Category, CategoryKind, pigment } from "../lib/api";
import { useRouter } from "../lib/router";
import "./Taxonomy.css";

const KIND_LABEL: Record<CategoryKind, string> = {
  psychoactive: "Psychoactive classes",
  chemical: "Chemical classes",
  mechanism: "Mechanism groups",
};
const KIND_NOTE: Record<CategoryKind, string> = {
  psychoactive: "grouped by the effect it primarily produces",
  chemical: "grouped by molecular scaffold",
  mechanism: "grouped by how it acts, not what it's built from",
};
const KIND_ORDER: CategoryKind[] = ["psychoactive", "chemical", "mechanism"];

export default function Taxonomy() {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [query, setQuery] = useState("");
  const { navigate, restoreScroll } = useRouter();

  useEffect(() => {
    listCategories().then((list) => setCats(list.sort((a, b) => b.members.length - a.members.length)));
  }, []);

  useEffect(() => {
    restoreScroll();
  }, [restoreScroll]);

  const groups = useMemo(() => {
    if (!cats) return null;
    const q = query.trim().toLowerCase();
    const filtered = q ? cats.filter((c) => c.name.toLowerCase().includes(q)) : cats;
    const byKind = new Map<CategoryKind, Category[]>();
    for (const kind of KIND_ORDER) byKind.set(kind, []);
    for (const c of filtered) byKind.get(c.kind)?.push(c);
    return byKind;
  }, [cats, query]);

  return (
    <div className="tax">
      <header className="tax-header">
        <div className="eyebrow">The Taxonomy</div>
        <h1 className="tax-title">Every way the codex is grouped</h1>
        <p className="tax-sub">
          294 specimens sorted three ways at once — by the effect they produce, by what they're
          built from, and by how they act on the body. The same substance often belongs to more
          than one shelf.
        </p>
        <input
          className="tax-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="filter classes…"
          spellCheck={false}
        />
      </header>

      {!groups && <div className="specimen-loading">gathering the shelves…</div>}

      {groups &&
        KIND_ORDER.map((kind) => {
          const list = groups.get(kind) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={kind} className="tax-section">
              <div className="tax-section-head">
                <h2>{KIND_LABEL[kind]}</h2>
                <span className="tax-section-note">{KIND_NOTE[kind]}</span>
              </div>
              <div className="tax-grid">
                {list.map((c) => (
                  <button
                    key={c.name}
                    className="tax-card"
                    style={{ ["--pig" as any]: pigment(c.name) }}
                    onClick={() => navigate({ view: "category", name: c.name })}
                  >
                    <span className="tax-card-dot" />
                    <span className="tax-card-name">{c.name}</span>
                    <span className="tax-card-count">{c.members.length}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
