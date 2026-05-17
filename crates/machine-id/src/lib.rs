use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MachineIdError {
    #[error("impossibile leggere machine uid: {0}")]
    ReadFailed(String),
}

/// Ritorna un hash SHA256 hex (lowercase, 64 char) dell'identificativo macchina,
/// con un namespace per prodotto così che lo stesso PC abbia ID diversi per app diverse.
pub fn machine_id_for(product_namespace: &str) -> Result<String, MachineIdError> {
    let raw = machine_uid::get().map_err(|e| MachineIdError::ReadFailed(e.to_string()))?;
    let mut hasher = Sha256::new();
    hasher.update(product_namespace.as_bytes());
    hasher.update(b":");
    hasher.update(raw.as_bytes());
    Ok(hex::encode(hasher.finalize()))
}

pub fn os_string() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "windows"
    }
    #[cfg(target_os = "macos")]
    {
        "macos"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        "unknown"
    }
}
