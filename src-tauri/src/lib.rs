use std::collections::HashMap;
use std::sync::OnceLock;

use serde::Serialize;
use serde_json::Value;

// Data is baked into the binary at compile time — no resource-path juggling,
// works identically in dev and in a bundled release.
const ATLAS_RAW: &str = include_str!("../data/atlas.json");
const SUBSTANCES_RAW: &str = include_str!("../data/substances.json");
const EFFECTS_RAW: &str = include_str!("../data/effects.json");
const CATEGORIES_RAW: &str = include_str!("../data/categories.json");
const NEURO_RAW: &str = include_str!("../data/neuro.json");
const BIPARTITE_RAW: &str = include_str!("../data/bipartite.json");

static ATLAS: OnceLock<Value> = OnceLock::new();
static ATLAS_INDEX: OnceLock<HashMap<String, Value>> = OnceLock::new();
static SUBSTANCES: OnceLock<HashMap<String, Value>> = OnceLock::new();
static EFFECTS: OnceLock<HashMap<String, Value>> = OnceLock::new();
static CATEGORIES: OnceLock<HashMap<String, Value>> = OnceLock::new();
static NEURO: OnceLock<HashMap<String, Value>> = OnceLock::new();
static BIPARTITE_ROOT: OnceLock<Value> = OnceLock::new();
static BIPARTITE: OnceLock<HashMap<String, Value>> = OnceLock::new();

fn atlas() -> &'static Value {
    ATLAS.get_or_init(|| serde_json::from_str(ATLAS_RAW).expect("atlas.json parse"))
}

fn atlas_index() -> &'static HashMap<String, Value> {
    ATLAS_INDEX.get_or_init(|| {
        let mut map = HashMap::new();
        if let Some(nodes) = atlas().get("substances").and_then(|v| v.as_array()) {
            for node in nodes {
                if let Some(name) = node.get("name").and_then(|v| v.as_str()) {
                    map.insert(name.to_string(), node.clone());
                }
            }
        }
        map
    })
}

fn substances() -> &'static HashMap<String, Value> {
    SUBSTANCES.get_or_init(|| serde_json::from_str(SUBSTANCES_RAW).expect("substances.json parse"))
}

fn effects() -> &'static HashMap<String, Value> {
    EFFECTS.get_or_init(|| serde_json::from_str(EFFECTS_RAW).expect("effects.json parse"))
}

fn categories() -> &'static HashMap<String, Value> {
    CATEGORIES.get_or_init(|| serde_json::from_str(CATEGORIES_RAW).expect("categories.json parse"))
}

fn neuro() -> &'static HashMap<String, Value> {
    NEURO.get_or_init(|| serde_json::from_str(NEURO_RAW).expect("neuro.json parse"))
}

fn bipartite_root() -> &'static Value {
    BIPARTITE_ROOT.get_or_init(|| serde_json::from_str(BIPARTITE_RAW).expect("bipartite.json parse"))
}

fn bipartite() -> &'static HashMap<String, Value> {
    BIPARTITE.get_or_init(|| {
        bipartite_root()
            .get("substances")
            .and_then(|v| v.as_object())
            .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .unwrap_or_default()
    })
}

/// The Firmament: every mapped substance with coords, class, neighbours, signature effects.
#[tauri::command]
fn get_atlas() -> Value {
    atlas().clone()
}

/// A single Specimen: the full scraped record merged with its atlas node
/// (coordinates, nearest kin, signature effects) so the page needs one call.
#[tauri::command]
fn get_substance(name: String) -> Option<Value> {
    let mut record = substances().get(&name)?.clone();
    if let (Some(obj), Some(node)) = (record.as_object_mut(), atlas_index().get(&name)) {
        obj.insert("atlas".to_string(), node.clone());
    }
    Some(record)
}

/// A single effect from the Subjective Effect Index: canonical description
/// plus every substance in the codex known to induce it.
#[tauri::command]
fn get_effect(name: String) -> Option<Value> {
    effects().get(&name).cloned()
}

/// The full effect taxonomy — used by the Sensorium's browse-by-category view.
#[tauri::command]
fn list_effects() -> Vec<Value> {
    effects().values().cloned().collect()
}

/// Every substance name that has a plate — so the UI can tell which
/// interaction references (e.g. "Lithium", "SSRIs") are dead ends.
#[tauri::command]
fn substance_names() -> Vec<String> {
    substances().keys().cloned().collect()
}

/// A single class page (definition + members).
#[tauri::command]
fn get_category(name: String) -> Option<Value> {
    categories().get(&name).cloned()
}

/// Every class page, minus the (potentially large) prose blocks — the
/// Taxonomy explorer only needs name/kind/member-count to lay out its grid.
#[tauri::command]
fn list_categories() -> Vec<Value> {
    categories()
        .values()
        .map(|c| {
            let mut slim = c.clone();
            if let Some(obj) = slim.as_object_mut() {
                obj.remove("blocks");
            }
            slim
        })
        .collect()
}

/// A substance's fuzzy neurotransmitter/receptor-target profile, extracted
/// from Pharmacology prose (targets + per-system aggregate scores).
#[tauri::command]
fn get_neuro(name: String) -> Option<Value> {
    neuro().get(&name).cloned()
}

fn systems_of(name: &str) -> HashMap<String, f64> {
    let mut map = HashMap::new();
    if let Some(rec) = neuro().get(name) {
        if let Some(obj) = rec.get("systems").and_then(|v| v.as_object()) {
            for (k, v) in obj {
                map.insert(k.clone(), v.as_f64().unwrap_or(0.0));
            }
        }
    }
    map
}

#[derive(Serialize)]
struct NeuroCompare {
    similarity: f64,
    systems: Vec<SystemRow>,
}

#[derive(Serialize)]
struct SystemRow {
    system: String,
    a: f64,
    b: f64,
}

/// Fuzzy cosine similarity between two substances' neurotransmitter-system
/// vectors, plus the per-system scores side by side for the Diptych.
#[tauri::command]
fn compare_neuro(a: String, b: String) -> NeuroCompare {
    let sa = systems_of(&a);
    let sb = systems_of(&b);
    let mut keys: Vec<String> = sa.keys().chain(sb.keys()).cloned().collect();
    keys.sort();
    keys.dedup();

    let mut dot = 0.0;
    let mut na = 0.0;
    let mut nb = 0.0;
    let mut rows = Vec::with_capacity(keys.len());
    for k in keys {
        let va = *sa.get(&k).unwrap_or(&0.0);
        let vb = *sb.get(&k).unwrap_or(&0.0);
        dot += va * vb;
        na += va * va;
        nb += vb * vb;
        rows.push(SystemRow { system: k, a: va, b: vb });
    }
    let similarity = if na > 0.0 && nb > 0.0 { dot / (na.sqrt() * nb.sqrt()) } else { 0.0 };
    rows.sort_by(|r1, r2| (r1.a.abs() + r1.b.abs()).partial_cmp(&(r2.a.abs() + r2.b.abs())).unwrap().reverse());
    NeuroCompare { similarity, systems: rows }
}

/// A substance's projected "binds-alike" graph neighborhood (cosine similarity
/// over fine-grained receptor/transporter targets) plus its divergence from
/// the "feels-alike" effect-similarity graph — where two drugs feel similar
/// but bind very differently, or vice versa.
#[tauri::command]
fn get_bipartite(name: String) -> Option<Value> {
    bipartite().get(&name).cloned()
}

/// Global top divergent pairs across the whole dataset, ranked by
/// |effect_similarity - target_similarity|.
#[tauri::command]
fn top_divergent() -> Value {
    bipartite_root()
        .get("top_divergent")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()))
}

/// Resolution tables so the UI can turn an interaction reference into a link:
/// { substances: {alias->canonical}, categories: {alias->display} }.
/// Aliases are lowercased.
#[tauri::command]
fn link_map() -> Value {
    let mut sub_alias = serde_json::Map::new();
    for (name, rec) in substances() {
        sub_alias.insert(name.to_lowercase(), Value::String(name.clone()));
        if let Some(common) = rec.get("commonNames").and_then(|v| v.as_array()) {
            for c in common.iter().filter_map(|c| c.as_str()) {
                sub_alias
                    .entry(c.trim().to_lowercase())
                    .or_insert_with(|| Value::String(name.clone()));
            }
        }
    }
    let mut cat_alias = serde_json::Map::new();
    for (display, cat) in categories() {
        cat_alias.insert(display.to_lowercase(), Value::String(display.clone()));
        if let Some(aliases) = cat.get("aliases").and_then(|v| v.as_array()) {
            for a in aliases.iter().filter_map(|a| a.as_str()) {
                cat_alias
                    .entry(a.trim().to_lowercase())
                    .or_insert_with(|| Value::String(display.clone()));
            }
        }
    }
    serde_json::json!({ "substances": sub_alias, "categories": cat_alias })
}

#[derive(Serialize)]
struct SearchHit {
    kind: &'static str, // "substance" | "effect"
    name: String,
    category: String,
    subcategory: String,
    mapped: bool,
}

/// The Register: prefix/substring search across every substance AND effect,
/// ranked so that name-start matches surface first.
#[tauri::command]
fn search(query: String) -> Vec<SearchHit> {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Vec::new();
    }
    let idx = atlas_index();
    let mut hits: Vec<(u8, SearchHit)> = Vec::new();

    for (name, rec) in substances() {
        let lname = name.to_lowercase();
        let mut rank: Option<u8> = None;
        if lname == q {
            rank = Some(0);
        } else if lname.starts_with(&q) {
            rank = Some(1);
        } else if lname.contains(&q) {
            rank = Some(2);
        } else if let Some(common) = rec.get("commonNames").and_then(|v| v.as_array()) {
            if common
                .iter()
                .filter_map(|c| c.as_str())
                .any(|c| c.to_lowercase().contains(&q))
            {
                rank = Some(3);
            }
        }

        if let Some(rank) = rank {
            let class = rec.get("class");
            let category = class
                .and_then(|c| c.get("psychoactive"))
                .and_then(|v| v.as_array())
                .and_then(|a| a.first())
                .and_then(|v| v.as_str())
                .unwrap_or("Uncategorized")
                .to_string();
            let subcategory = class
                .and_then(|c| c.get("chemical"))
                .and_then(|v| v.as_array())
                .and_then(|a| a.first())
                .and_then(|v| v.as_str())
                .unwrap_or("Unclassified")
                .to_string();
            hits.push((
                rank,
                SearchHit {
                    kind: "substance",
                    name: name.clone(),
                    category,
                    subcategory,
                    mapped: idx.contains_key(name),
                },
            ));
        }
    }

    for (name, rec) in effects() {
        let lname = name.to_lowercase();
        let mut rank: Option<u8> = None;
        if lname == q {
            rank = Some(0);
        } else if lname.starts_with(&q) {
            rank = Some(1);
        } else if lname.contains(&q) {
            rank = Some(2);
        }
        if let Some(rank) = rank {
            let category = rec
                .get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("Effect")
                .to_string();
            let subcategory = rec
                .get("subcategory")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let has_subs = rec
                .get("substances")
                .and_then(|v| v.as_array())
                .map(|a| !a.is_empty())
                .unwrap_or(false);
            hits.push((
                rank + 1, // effects rank just below substance ties at the same tier
                SearchHit {
                    kind: "effect",
                    name: name.clone(),
                    category,
                    subcategory,
                    mapped: has_subs,
                },
            ));
        }
    }

    for (name, cat) in categories() {
        let lname = name.to_lowercase();
        let mut rank: Option<u8> = None;
        if lname == q {
            rank = Some(0);
        } else if lname.starts_with(&q) {
            rank = Some(1);
        } else if lname.contains(&q) {
            rank = Some(2);
        } else if let Some(aliases) = cat.get("aliases").and_then(|v| v.as_array()) {
            if aliases
                .iter()
                .filter_map(|a| a.as_str())
                .any(|a| a.to_lowercase().contains(&q))
            {
                rank = Some(3);
            }
        }
        if let Some(rank) = rank {
            let kind = cat.get("kind").and_then(|v| v.as_str()).unwrap_or("class").to_string();
            hits.push((
                rank,
                SearchHit {
                    kind: "category",
                    name: name.clone(),
                    category: kind,
                    subcategory: String::new(),
                    mapped: true,
                },
            ));
        }
    }

    hits.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.name.cmp(&b.1.name)));
    hits.into_iter().take(40).map(|(_, h)| h).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_atlas,
            get_substance,
            get_effect,
            list_effects,
            substance_names,
            get_category,
            list_categories,
            get_neuro,
            compare_neuro,
            get_bipartite,
            top_divergent,
            link_map,
            search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
