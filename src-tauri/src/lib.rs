mod data_key;
pub mod licensing;

use std::collections::HashMap;
use std::sync::OnceLock;

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use serde::Serialize;
use serde_json::Value;

const ATLAS_ENC: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/atlas.json.enc"));
const SUBSTANCES_ENC: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/substances.json.enc"));
const EFFECTS_ENC: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/effects.json.enc"));
const CATEGORIES_ENC: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/categories.json.enc"));
const NEURO_ENC: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/neuro.json.enc"));
const BIPARTITE_ENC: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/bipartite.json.enc"));

fn decrypt(bytes: &[u8]) -> String {
    let (nonce_bytes, ciphertext) = bytes.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(&data_key::DATA_KEY).expect("32-byte key");
    let nonce = Nonce::from_slice(nonce_bytes);
    let plain = cipher
        .decrypt(nonce, ciphertext)
        .expect("embedded dataset failed to decrypt — the binary may be corrupted");
    String::from_utf8(plain).expect("dataset is valid UTF-8")
}

static ATLAS: OnceLock<Value> = OnceLock::new();
static ATLAS_INDEX: OnceLock<HashMap<String, Value>> = OnceLock::new();
static SUBSTANCES: OnceLock<HashMap<String, Value>> = OnceLock::new();
static EFFECTS: OnceLock<HashMap<String, Value>> = OnceLock::new();
static CATEGORIES: OnceLock<HashMap<String, Value>> = OnceLock::new();
static NEURO: OnceLock<HashMap<String, Value>> = OnceLock::new();
static BIPARTITE_ROOT: OnceLock<Value> = OnceLock::new();
static BIPARTITE: OnceLock<HashMap<String, Value>> = OnceLock::new();

fn atlas() -> &'static Value {
    ATLAS.get_or_init(|| serde_json::from_str(&decrypt(ATLAS_ENC)).expect("atlas.json parse"))
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
    SUBSTANCES.get_or_init(|| serde_json::from_str(&decrypt(SUBSTANCES_ENC)).expect("substances.json parse"))
}

fn effects() -> &'static HashMap<String, Value> {
    EFFECTS.get_or_init(|| serde_json::from_str(&decrypt(EFFECTS_ENC)).expect("effects.json parse"))
}

fn categories() -> &'static HashMap<String, Value> {
    CATEGORIES.get_or_init(|| serde_json::from_str(&decrypt(CATEGORIES_ENC)).expect("categories.json parse"))
}

fn neuro() -> &'static HashMap<String, Value> {
    NEURO.get_or_init(|| serde_json::from_str(&decrypt(NEURO_ENC)).expect("neuro.json parse"))
}

fn bipartite_root() -> &'static Value {
    BIPARTITE_ROOT.get_or_init(|| serde_json::from_str(&decrypt(BIPARTITE_ENC)).expect("bipartite.json parse"))
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

const UNLICENSED: &str = "unlicensed";

fn require_license() -> Result<(), String> {
    if licensing::is_licensed() {
        Ok(())
    } else {
        Err(UNLICENSED.to_string())
    }
}

#[tauri::command]
fn get_atlas() -> Result<Value, String> {
    require_license()?;
    Ok(atlas().clone())
}

#[tauri::command]
fn get_substance(name: String) -> Result<Option<Value>, String> {
    require_license()?;
    let Some(mut record) = substances().get(&name).cloned() else {
        return Ok(None);
    };
    if let (Some(obj), Some(node)) = (record.as_object_mut(), atlas_index().get(&name)) {
        obj.insert("atlas".to_string(), node.clone());
    }
    Ok(Some(record))
}

#[tauri::command]
fn get_effect(name: String) -> Result<Option<Value>, String> {
    require_license()?;
    Ok(effects().get(&name).cloned())
}

#[tauri::command]
fn list_effects() -> Result<Vec<Value>, String> {
    require_license()?;
    Ok(effects().values().cloned().collect())
}

#[tauri::command]
fn substance_names() -> Result<Vec<String>, String> {
    require_license()?;
    Ok(substances().keys().cloned().collect())
}

#[tauri::command]
fn get_category(name: String) -> Result<Option<Value>, String> {
    require_license()?;
    Ok(categories().get(&name).cloned())
}

#[tauri::command]
fn list_categories() -> Result<Vec<Value>, String> {
    require_license()?;
    Ok(categories()
        .values()
        .map(|c| {
            let mut slim = c.clone();
            if let Some(obj) = slim.as_object_mut() {
                obj.remove("blocks");
            }
            slim
        })
        .collect())
}

#[tauri::command]
fn get_neuro(name: String) -> Result<Option<Value>, String> {
    require_license()?;
    Ok(neuro().get(&name).cloned())
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

#[tauri::command]
fn compare_neuro(a: String, b: String) -> Result<NeuroCompare, String> {
    require_license()?;
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
    Ok(NeuroCompare { similarity, systems: rows })
}

#[tauri::command]
fn get_bipartite(name: String) -> Result<Option<Value>, String> {
    require_license()?;
    Ok(bipartite().get(&name).cloned())
}

#[tauri::command]
fn top_divergent() -> Result<Value, String> {
    require_license()?;
    Ok(bipartite_root()
        .get("top_divergent")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new())))
}

#[tauri::command]
fn link_map() -> Result<Value, String> {
    require_license()?;
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
    Ok(serde_json::json!({ "substances": sub_alias, "categories": cat_alias }))
}

#[derive(Serialize)]
struct SearchHit {
    kind: &'static str,
    name: String,
    category: String,
    subcategory: String,
    mapped: bool,
}

#[tauri::command]
fn search(query: String) -> Result<Vec<SearchHit>, String> {
    require_license()?;
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Ok(Vec::new());
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
                rank + 1,
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
    Ok(hits.into_iter().take(40).map(|(_, h)| h).collect())
}

#[derive(Serialize)]
struct LicenseStatus {
    valid: bool,
    machine_id: String,
    licensee: Option<String>,
    email: Option<String>,
    tier: Option<String>,
    expires: Option<String>,
}

fn license_status() -> LicenseStatus {
    let payload = licensing::current_payload();
    LicenseStatus {
        valid: payload.is_some(),
        machine_id: licensing::machine_id(),
        licensee: payload.as_ref().map(|p| p.licensee.clone()),
        email: payload.as_ref().map(|p| p.email.clone()),
        tier: payload.as_ref().map(|p| p.tier.clone()),
        expires: payload.as_ref().and_then(|p| p.expires.clone()),
    }
}

#[tauri::command]
fn get_license_status() -> LicenseStatus {
    license_status()
}

#[tauri::command]
fn install_license(license_text: String) -> Result<LicenseStatus, String> {
    licensing::install(&license_text)?;
    Ok(license_status())
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
            search,
            get_license_status,
            install_license
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
