use std::fs;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const PUBLIC_KEY: [u8; 32] = [
    0xCC, 0xE7, 0x77, 0x62, 0xCA, 0x4A, 0x01, 0x0A, 0xAC, 0x78, 0xA9, 0xA4, 0xDD, 0x69, 0x6E, 0x86,
    0x5C, 0xD7, 0xD0, 0xAF, 0x54, 0x0F, 0x07, 0x4D, 0xE5, 0xF0, 0x36, 0xF8, 0x84, 0xD2, 0x62, 0x46,
];

#[derive(Serialize, Deserialize, Clone)]
pub struct LicensePayload {
    pub licensee: String,
    pub email: String,
    pub machine_id: String,
    pub tier: String,
    pub issued: String,
    pub expires: Option<String>,
    pub nonce: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LicenseFile {
    pub payload: LicensePayload,
    pub sig: String,
}

fn canonical_message(p: &LicensePayload) -> String {
    format!(
        "{}|{}|{}|{}|{}|{}|{}",
        p.licensee,
        p.email,
        p.machine_id,
        p.tier,
        p.issued,
        p.expires.clone().unwrap_or_default(),
        p.nonce
    )
}

pub fn machine_id() -> String {
    static ID: OnceLock<String> = OnceLock::new();
    ID.get_or_init(|| {
        let raw = machine_uid::get().unwrap_or_else(|_| "unknown-machine".to_string());
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        hasher.update(b"substancia-license-v1");
        let digest = format!("{:x}", hasher.finalize());
        digest[..32].to_string()
    })
    .clone()
}

fn license_path() -> PathBuf {
    let base = dirs::config_dir().unwrap_or_else(std::env::temp_dir);
    let dir = base.join("Substancia");
    let _ = fs::create_dir_all(&dir);
    dir.join("license.json")
}

pub enum LicenseError {
    Missing,
    Malformed,
    BadSignature,
    WrongMachine,
    Expired,
}

impl LicenseError {
    pub fn message(&self) -> &'static str {
        match self {
            LicenseError::Missing => "No license was supplied.",
            LicenseError::Malformed => "That doesn't look like a valid Substancia license file.",
            LicenseError::BadSignature => {
                "This license's signature doesn't check out — it may have been altered or corrupted."
            }
            LicenseError::WrongMachine => "This license was issued for a different machine.",
            LicenseError::Expired => "This license has expired.",
        }
    }
}

pub const ANY_MACHINE: &str = "*";

fn verify_payload(file: &LicenseFile) -> Result<(), LicenseError> {
    let vk = VerifyingKey::from_bytes(&PUBLIC_KEY).map_err(|_| LicenseError::Malformed)?;
    let sig_bytes = STANDARD.decode(&file.sig).map_err(|_| LicenseError::Malformed)?;
    let sig_arr: [u8; 64] = sig_bytes.try_into().map_err(|_| LicenseError::Malformed)?;
    let sig = Signature::from_bytes(&sig_arr);
    let msg = canonical_message(&file.payload);
    vk.verify(msg.as_bytes(), &sig)
        .map_err(|_| LicenseError::BadSignature)?;

    if file.payload.machine_id != ANY_MACHINE && file.payload.machine_id != machine_id() {
        return Err(LicenseError::WrongMachine);
    }
    if let Some(exp) = &file.payload.expires {
        if !exp.is_empty() && exp.as_str() < today_string().as_str() {
            return Err(LicenseError::Expired);
        }
    }
    Ok(())
}

fn today_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let z = (secs / 86400) as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}", y, m, d)
}

static LICENSE_STATE: OnceLock<Mutex<Option<LicensePayload>>> = OnceLock::new();

fn state() -> &'static Mutex<Option<LicensePayload>> {
    LICENSE_STATE.get_or_init(|| Mutex::new(load_from_disk().ok()))
}

fn load_from_disk() -> Result<LicensePayload, LicenseError> {
    let text = fs::read_to_string(license_path()).map_err(|_| LicenseError::Missing)?;
    let file: LicenseFile = serde_json::from_str(&text).map_err(|_| LicenseError::Malformed)?;
    verify_payload(&file)?;
    Ok(file.payload)
}

pub fn is_licensed() -> bool {
    state().lock().unwrap().is_some()
}

pub fn current_payload() -> Option<LicensePayload> {
    state().lock().unwrap().clone()
}

pub fn install(license_text: &str) -> Result<LicensePayload, &'static str> {
    let file: LicenseFile =
        serde_json::from_str(license_text.trim()).map_err(|_| LicenseError::Malformed.message())?;
    verify_payload(&file).map_err(|e| e.message())?;
    let _ = fs::write(license_path(), license_text.trim());
    *state().lock().unwrap() = Some(file.payload.clone());
    Ok(file.payload)
}
