import { invoke } from "@tauri-apps/api/core";

// ——— types mirroring the Rust backend / scraped records ———

export interface Neighbor {
  name: string;
  score: number;
}

export interface AtlasNode {
  name: string;
  url: string | null;
  summary: string | null;
  category: string;
  subcategory: string;
  x: number;
  y: number;
  signature_effects: string[];
  effect_count: number;
  neighbors: Neighbor[];
}

export interface Atlas {
  vocab_size: number;
  substances: AtlasNode[];
}

export interface Range {
  min: number | null;
  max: number | null;
  units?: string | null;
}

export interface Roa {
  name: string | null;
  dose: {
    units: string | null;
    threshold: number | null;
    light: Range | null;
    common: Range | null;
    strong: Range | null;
    heavy: number | null;
  } | null;
  duration: Record<string, Range | null> | null;
  bioavailability: Range | null;
}

export interface EffectItem {
  name: string;
  description: string;
}

// Prose is delivered as typed blocks so the reader gets an annotated field
// guide, not a wall of flattened text.
export type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; level: "dangerous" | "unsafe" | "uncertain"; subject: string; text: string };

export interface Substance {
  name: string;
  commonNames: string[] | null;
  systematicName: string | null;
  url: string | null;
  summary: string | null;
  summaryHazard: boolean;
  class: { chemical: string[] | null; psychoactive: string[] | null } | null;
  tolerance: { full: string | null; half: string | null; zero: string | null } | null;
  effects: { name: string; url: string | null }[];
  roas: Roa[] | null;
  dangerousInteractions: { name: string }[] | null;
  unsafeInteractions: { name: string }[] | null;
  uncertainInteractions: { name: string }[] | null;
  addictionPotential: string | null;
  toxicity: string[] | null;
  crossTolerances: string[] | null;
  prose: Record<string, Block[]>;
  subjective_effects: Record<string, EffectItem[]>;
  atlas?: AtlasNode;
}

export interface SearchHit {
  kind: "substance" | "effect" | "category";
  name: string;
  category: string;
  subcategory: string;
  mapped: boolean;
}

export interface EffectSubstanceLink {
  substance: string;
  category: string;
  subcategory: string;
  description: string;
}

export interface Effect {
  name: string;
  url: string;
  category: string | null;
  subcategory: string | null;
  description: Block[];
  substances: EffectSubstanceLink[];
}

export interface CategoryMember {
  name: string;
  category: string;
  subcategory: string;
}

export type CategoryKind = "psychoactive" | "chemical" | "mechanism";

export interface Category {
  name: string;
  kind: CategoryKind;
  aliases: string[];
  url: string;
  blocks: Block[];
  members: CategoryMember[];
}

export interface NeuroTarget {
  code: string;
  system: string;
  score: number; // -1 (antagonist/blocking) .. +1 (strong agonist/releaser)
  mentions: number;
}

export interface NeuroProfile {
  targets: NeuroTarget[];
  systems: Record<string, number>;
}

export interface NeuroSystemRow {
  system: string;
  a: number;
  b: number;
}

export interface NeuroCompare {
  similarity: number;
  systems: NeuroSystemRow[];
}

export interface BindNeighbor {
  name: string;
  score: number; // cosine similarity over fine-grained receptor/transporter targets
}

export interface DivergenceRow {
  name: string;
  effect_sim: number;
  target_sim: number;
  divergence: number; // effect_sim - target_sim; positive = feels alike but binds differently
}

export interface BipartiteProfile {
  target_neighbors: BindNeighbor[];
  divergence: DivergenceRow[];
}

export interface DivergentPair {
  a: string;
  b: string;
  effect_sim: number;
  target_sim: number;
  divergence: number;
  direction: "feels-alike-binds-different" | "binds-alike-feels-different";
}

export interface LinkMap {
  substances: Record<string, string>; // lowercased alias -> canonical substance
  categories: Record<string, string>; // lowercased alias -> category display name
}

export type Reference =
  | { kind: "substance"; name: string }
  | { kind: "category"; name: string }
  | { kind: "none"; name: string };

// ——— backend commands ———
// In the Tauri window these hit the Rust backend. In a plain browser (UI dev /
// preview) they fall back to the same JSON served statically — identical shapes.

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let atlasCache: Atlas | null = null;
let subsCache: Record<string, Substance> | null = null;
let effectsCache: Record<string, Effect> | null = null;
let catsCache: Record<string, Category> | null = null;

async function devAtlas(): Promise<Atlas> {
  if (!atlasCache) atlasCache = await fetch("/data/atlas.json").then((r) => r.json());
  return atlasCache!;
}
async function devSubs(): Promise<Record<string, Substance>> {
  if (!subsCache) subsCache = await fetch("/data/substances.json").then((r) => r.json());
  return subsCache!;
}
async function devEffects(): Promise<Record<string, Effect>> {
  if (!effectsCache) effectsCache = await fetch("/data/effects.json").then((r) => r.json());
  return effectsCache!;
}
async function devCats(): Promise<Record<string, Category>> {
  if (!catsCache) catsCache = await fetch("/data/categories.json").then((r) => r.json());
  return catsCache!;
}
let neuroCache: Record<string, NeuroProfile> | null = null;
async function devNeuro(): Promise<Record<string, NeuroProfile>> {
  if (!neuroCache) neuroCache = await fetch("/data/neuro.json").then((r) => r.json());
  return neuroCache!;
}
let bipartiteCache: { substances: Record<string, BipartiteProfile>; top_divergent: DivergentPair[] } | null = null;
async function devBipartite() {
  if (!bipartiteCache) bipartiteCache = await fetch("/data/bipartite.json").then((r) => r.json());
  return bipartiteCache!;
}

export const getAtlas = (): Promise<Atlas> => (inTauri ? invoke<Atlas>("get_atlas") : devAtlas());

export const getEffect = async (name: string): Promise<Effect | null> => {
  if (inTauri) return invoke<Effect | null>("get_effect", { name });
  const effs = await devEffects();
  return effs[name] ?? null;
};

export const listEffects = async (): Promise<Effect[]> => {
  if (inTauri) return invoke<Effect[]>("list_effects");
  const effs = await devEffects();
  return Object.values(effs);
};

let nameSetCache: Set<string> | null = null;
/** Names that have a Specimen plate — lets the UI avoid dead-end links. */
export const substanceNameSet = async (): Promise<Set<string>> => {
  if (nameSetCache) return nameSetCache;
  const names = inTauri
    ? await invoke<string[]>("substance_names")
    : Object.keys(await devSubs());
  nameSetCache = new Set(names);
  return nameSetCache;
};

export const getCategory = async (name: string): Promise<Category | null> => {
  if (inTauri) return invoke<Category | null>("get_category", { name });
  const cats = await devCats();
  return cats[name] ?? null;
};

export const listCategories = async (): Promise<Category[]> => {
  if (inTauri) return invoke<Category[]>("list_categories");
  const cats = await devCats();
  return Object.values(cats);
};

export const getNeuro = async (name: string): Promise<NeuroProfile | null> => {
  if (inTauri) return invoke<NeuroProfile | null>("get_neuro", { name });
  const neuro = await devNeuro();
  return neuro[name] ?? null;
};

export const compareNeuro = async (a: string, b: string): Promise<NeuroCompare> => {
  if (inTauri) return invoke<NeuroCompare>("compare_neuro", { a, b });
  const neuro = await devNeuro();
  const sa = neuro[a]?.systems ?? {};
  const sb = neuro[b]?.systems ?? {};
  const keys = [...new Set([...Object.keys(sa), ...Object.keys(sb)])].sort();
  let dot = 0, na = 0, nb = 0;
  const rows: NeuroSystemRow[] = keys.map((k) => {
    const va = sa[k] ?? 0;
    const vb = sb[k] ?? 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
    return { system: k, a: va, b: vb };
  });
  rows.sort((r1, r2) => Math.abs(r2.a) + Math.abs(r2.b) - (Math.abs(r1.a) + Math.abs(r1.b)));
  const similarity = na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  return { similarity, systems: rows };
};

export const getBipartite = async (name: string): Promise<BipartiteProfile | null> => {
  if (inTauri) return invoke<BipartiteProfile | null>("get_bipartite", { name });
  const bp = await devBipartite();
  return bp.substances[name] ?? null;
};

export const topDivergent = async (): Promise<DivergentPair[]> => {
  if (inTauri) return invoke<DivergentPair[]>("top_divergent");
  const bp = await devBipartite();
  return bp.top_divergent;
};

let linkMapCache: LinkMap | null = null;
async function getLinkMap(): Promise<LinkMap> {
  if (linkMapCache) return linkMapCache;
  if (inTauri) {
    linkMapCache = await invoke<LinkMap>("link_map");
  } else {
    const [subs, cats] = await Promise.all([devSubs(), devCats()]);
    const substances: Record<string, string> = {};
    for (const [name, rec] of Object.entries(subs)) {
      const key = name.toLowerCase();
      if (!(key in substances)) substances[key] = name;
      for (const c of rec.commonNames ?? []) {
        const ck = c.trim().toLowerCase();
        if (!(ck in substances)) substances[ck] = name;
      }
    }
    const categories: Record<string, string> = {};
    for (const [display, cat] of Object.entries(cats)) {
      categories[display.toLowerCase()] = display;
      for (const a of cat.aliases ?? []) categories[a.trim().toLowerCase()] = display;
    }
    linkMapCache = { substances, categories };
  }
  return linkMapCache;
}

/** Build a synchronous resolver once the link map is loaded. */
export async function makeResolver(): Promise<(subject: string) => Reference> {
  const map = await getLinkMap();
  return (subject: string): Reference => {
    const raw = subject.trim();
    const k = raw.toLowerCase();
    // substance first (aliases like DXM -> Dextromethorphan)
    if (map.substances[k]) return { kind: "substance", name: map.substances[k] };
    // then category (SSRIs, MAOIs, Psychedelics …)
    if (map.categories[k]) return { kind: "category", name: map.categories[k] };
    // tolerate a trailing plural "s"
    const singular = k.endsWith("s") ? k.slice(0, -1) : k;
    if (map.substances[singular]) return { kind: "substance", name: map.substances[singular] };
    if (map.categories[singular]) return { kind: "category", name: map.categories[singular] };
    return { kind: "none", name: raw };
  };
}

export const getSubstance = async (name: string): Promise<Substance | null> => {
  if (inTauri) return invoke<Substance | null>("get_substance", { name });
  const [subs, atlas] = await Promise.all([devSubs(), devAtlas()]);
  const rec = subs[name];
  if (!rec) return null;
  const node = atlas.substances.find((s) => s.name === name);
  return node ? { ...rec, atlas: node } : rec;
};

export const search = async (query: string): Promise<SearchHit[]> => {
  if (inTauri) return invoke<SearchHit[]>("search", { query });
  const [subs, atlas, effs] = await Promise.all([devSubs(), devAtlas(), devEffects()]);
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const mapped = new Set(atlas.substances.map((s) => s.name));
  const scored: [number, SearchHit][] = [];

  for (const [name, rec] of Object.entries(subs)) {
    const l = name.toLowerCase();
    let rank = -1;
    if (l === q) rank = 0;
    else if (l.startsWith(q)) rank = 1;
    else if (l.includes(q)) rank = 2;
    else if (rec.commonNames?.some((c) => c.toLowerCase().includes(q))) rank = 3;
    if (rank < 0) continue;
    scored.push([
      rank,
      {
        kind: "substance",
        name,
        category: rec.class?.psychoactive?.[0] ?? "Uncategorized",
        subcategory: rec.class?.chemical?.[0] ?? "Unclassified",
        mapped: mapped.has(name),
      },
    ]);
  }

  for (const [name, rec] of Object.entries(effs)) {
    const l = name.toLowerCase();
    let rank = -1;
    if (l === q) rank = 0;
    else if (l.startsWith(q)) rank = 1;
    else if (l.includes(q)) rank = 2;
    if (rank < 0) continue;
    scored.push([
      rank + 1,
      {
        kind: "effect",
        name,
        category: rec.category ?? "Effect",
        subcategory: rec.subcategory ?? "",
        mapped: rec.substances.length > 0,
      },
    ]);
  }

  const cats = await devCats();
  for (const [name, cat] of Object.entries(cats)) {
    const l = name.toLowerCase();
    let rank = -1;
    if (l === q) rank = 0;
    else if (l.startsWith(q)) rank = 1;
    else if (l.includes(q)) rank = 2;
    else if (cat.aliases?.some((a) => a.toLowerCase().includes(q))) rank = 3;
    if (rank < 0) continue;
    scored.push([
      rank,
      {
        kind: "category",
        name,
        category: cat.kind,
        subcategory: "",
        mapped: true,
      },
    ]);
  }

  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, 40).map(([, h]) => h);
};

// ——— pigment class-coding (mirrors theme.css tokens) ———

const PIGMENT_VAR: Record<string, string> = {
  Psychedelic: "--psychedelic",
  Dissociatives: "--dissociatives",
  Stimulants: "--stimulants",
  Depressant: "--depressant",
  Entactogen: "--entactogen",
  Opioids: "--opioids",
  Nootropic: "--nootropic",
  Cannabinoid: "--cannabinoid",
  Hallucinogens: "--hallucinogens",
  Deliriant: "--deliriant",
  Antipsychotic: "--antipsychotic",
  Eugeroics: "--eugeroics",
  Oneirogen: "--oneirogen",
  Antidepressants: "--antidepressants",
  Hypnotic: "--hypnotic",
  Uncategorized: "--uncategorized",
};

function pigmentVarName(category: string): string {
  if (PIGMENT_VAR[category]) return PIGMENT_VAR[category];
  // class pages are named in the plural ("Psychedelics"); atlas/pigment
  // keys use the GraphQL singular ("Psychedelic") — tolerate either.
  const singular = category.endsWith("s") ? category.slice(0, -1) : category;
  return PIGMENT_VAR[singular] ?? "--uncategorized";
}

/** CSS var() reference for a class — resolves live to the current theme. */
export function pigment(category: string): string {
  return `var(${pigmentVarName(category)})`;
}

/** Resolved hex for canvas drawing (canvas can't read CSS vars directly). */
export function pigmentHex(category: string): string {
  const varName = pigmentVarName(category);
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || "#9A9488";
}
