import { useEffect, useRef, useState, useCallback } from "react";
import { search, SearchHit, pigment } from "../lib/api";
import { useRouter } from "../lib/router";
import { IconConfluence, IconChemistry, IconPharmacology, IconPhenomenology } from "../lib/icons";
import "./Register.css";

const KIND_COLOR: Record<string, string> = {
  psychoactive: "var(--effect-accent)",
  chemical: "var(--dissociatives)",
  mechanism: "var(--nootropic)",
};
const KIND_ICON: Record<string, typeof IconConfluence> = {
  psychoactive: IconConfluence,
  chemical: IconChemistry,
  mechanism: IconPharmacology,
};
const KIND_LABEL: Record<string, string> = {
  psychoactive: "class",
  chemical: "class",
  mechanism: "mechanism",
};

export default function Register() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !open)) {
        const t = e.target as HTMLElement;
        if (e.key === "/" && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") close();
    };
    const onSummon = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("substancia:register", onSummon);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("substancia:register", onSummon);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    let alive = true;
    if (!query.trim()) {
      setHits([]);
      return;
    }
    search(query).then((r) => {
      if (alive) {
        setHits(r);
        setActive(0);
      }
    });
    return () => {
      alive = false;
    };
  }, [query]);

  const choose = useCallback(
    (hit: SearchHit) => {
      if (!hit.mapped) return;
      if (hit.kind === "effect") navigate({ view: "effect", name: hit.name });
      else if (hit.kind === "category") navigate({ view: "category", name: hit.name });
      else navigate({ view: "specimen", name: hit.name });
      close();
    },
    [navigate, close]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      choose(hits[active]);
    }
  };

  if (!open) return null;

  return (
    <div className="register-scrim" onMouseDown={close}>
      <div className="register" onMouseDown={(e) => e.stopPropagation()}>
        <div className="register-head">
          <span className="register-glyph">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search the pharmacopoeia…"
            spellCheck={false}
          />
          <span className="register-hint">esc</span>
        </div>
        {hits.length > 0 && (
          <ul className="register-list">
            {hits.map((h, i) => {
              const CatIcon = h.kind === "category" ? KIND_ICON[h.category] : null;
              const dotColor =
                h.kind === "substance"
                  ? pigment(h.category)
                  : h.kind === "category"
                  ? KIND_COLOR[h.category] ?? "var(--faint)"
                  : "var(--effect-accent)";
              const tag =
                h.kind === "effect"
                  ? "effect"
                  : h.kind === "category"
                  ? KIND_LABEL[h.category] ?? "class"
                  : `${h.category} · ${h.subcategory}`;
              return (
                <li
                  key={`${h.kind}-${h.name}`}
                  className={`register-hit kind-${h.kind} ${i === active ? "active" : ""} ${h.mapped ? "" : "unmapped"}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(h)}
                >
                  <span className="hit-glyph" style={{ color: dotColor }}>
                    {h.kind === "effect" ? (
                      <IconPhenomenology size={15} />
                    ) : CatIcon ? (
                      <CatIcon size={15} />
                    ) : (
                      <span className="hit-dot" style={{ background: dotColor }} />
                    )}
                  </span>
                  <span className="hit-name">{h.name}</span>
                  <span className="hit-class">{tag}</span>
                  {!h.mapped && <span className="hit-unmapped">unlinked</span>}
                </li>
              );
            })}
          </ul>
        )}
        {query.trim() && hits.length === 0 && (
          <div className="register-empty">No specimen by that name.</div>
        )}
      </div>
    </div>
  );
}
