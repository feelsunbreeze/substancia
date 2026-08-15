use aes_gcm::aead::{Aead, AeadCore, KeyInit, OsRng};
use aes_gcm::Aes256Gcm;
use std::env;
use std::fs;
use std::path::Path;

// Must be the same 32 bytes lib.rs decrypts with.
include!("src/data_key.rs");

/// Encrypts one dataset from `data/` into `OUT_DIR` at every build, so the
/// plaintext JSON in `data/` never ends up byte-for-byte inside the compiled
/// binary (see src-tauri/src/data_key.rs for why). Format: 12-byte nonce
/// followed by the AES-256-GCM ciphertext (which includes its own auth tag).
fn encrypt_file(src: &str, out_dir: &Path, out_name: &str) {
    let plaintext = fs::read(src).unwrap_or_else(|e| panic!("failed to read {src}: {e}"));
    let cipher = Aes256Gcm::new_from_slice(&DATA_KEY).expect("32-byte key");
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_ref())
        .unwrap_or_else(|e| panic!("failed to encrypt {src}: {e}"));

    let mut out = Vec::with_capacity(nonce.len() + ciphertext.len());
    out.extend_from_slice(nonce.as_slice());
    out.extend_from_slice(&ciphertext);
    fs::write(out_dir.join(out_name), out).unwrap_or_else(|e| panic!("failed to write {out_name}: {e}"));

    println!("cargo:rerun-if-changed={src}");
}

fn main() {
    tauri_build::build();

    let out_dir = env::var("OUT_DIR").expect("OUT_DIR set by cargo");
    let out_dir = Path::new(&out_dir);

    encrypt_file("data/atlas.json", out_dir, "atlas.json.enc");
    encrypt_file("data/substances.json", out_dir, "substances.json.enc");
    encrypt_file("data/effects.json", out_dir, "effects.json.enc");
    encrypt_file("data/categories.json", out_dir, "categories.json.enc");
    encrypt_file("data/neuro.json", out_dir, "neuro.json.enc");
    encrypt_file("data/bipartite.json", out_dir, "bipartite.json.enc");
}
