// Plugin Tauri 2 che espone i comandi attivazione/heartbeat alle app.
// L'app embedda la chiave pubblica come byte slice e configura il product_slug.

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::{plugin::TauriPlugin, Manager, Runtime};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LicenseError {
    #[error("network error: {0}")]
    Network(String),
    #[error("server error {status}: {body}")]
    Server { status: u16, body: String },
    #[error("token invalido: {0}")]
    Token(String),
    #[error("machine id: {0}")]
    MachineId(String),
    #[error("config mancante: {0}")]
    Config(String),
    #[error("storage: {0}")]
    Storage(String),
}

impl serde::Serialize for LicenseError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub struct LicenseConfig {
    pub product_slug: &'static str,
    pub api_base: &'static str,
    pub public_key_pem: &'static [u8],
    pub app_version: &'static str,
}

static CONFIG: OnceLock<LicenseConfig> = OnceLock::new();

pub fn init<R: Runtime>(config: LicenseConfig) -> TauriPlugin<R> {
    CONFIG.set(config).ok();
    tauri::plugin::Builder::new("license")
        .invoke_handler(tauri::generate_handler![
            current_machine_id,
            activate,
            heartbeat,
            verify_local,
            load_stored_token,
            save_token,
            clear_token,
        ])
        .build()
}

fn config() -> Result<&'static LicenseConfig, LicenseError> {
    CONFIG
        .get()
        .ok_or_else(|| LicenseError::Config("plugin non inizializzato".into()))
}

#[tauri::command]
fn current_machine_id() -> Result<String, LicenseError> {
    let cfg = config()?;
    machine_id::machine_id_for(cfg.product_slug).map_err(|e| LicenseError::MachineId(e.to_string()))
}

#[derive(Serialize)]
struct ActivateRequest<'a> {
    code: &'a str,
    machine_id: String,
    machine_label: Option<&'a str>,
    os: &'static str,
    app_version: &'static str,
}

#[derive(Deserialize, Serialize)]
pub struct ActivateResponse {
    pub token: String,
    pub product: String,
    pub tier: String,
    pub expires_at: String,
}

#[tauri::command]
async fn activate(code: String, machine_label: Option<String>) -> Result<ActivateResponse, LicenseError> {
    let cfg = config()?;
    let machine_id = machine_id::machine_id_for(cfg.product_slug)
        .map_err(|e| LicenseError::MachineId(e.to_string()))?;
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/licenses/activate", cfg.api_base))
        .json(&ActivateRequest {
            code: &code,
            machine_id,
            machine_label: machine_label.as_deref(),
            os: machine_id::os_string(),
            app_version: cfg.app_version,
        })
        .send()
        .await
        .map_err(|e| LicenseError::Network(e.to_string()))?;
    let status = res.status();
    if !status.is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err(LicenseError::Server { status: status.as_u16(), body });
    }
    let parsed = res
        .json::<ActivateResponse>()
        .await
        .map_err(|e| LicenseError::Network(e.to_string()))?;
    Ok(parsed)
}

#[derive(Serialize)]
struct HeartbeatRequest<'a> {
    token: &'a str,
}

#[derive(Deserialize, Serialize)]
pub struct HeartbeatResponse {
    pub valid: bool,
    pub token: Option<String>,
    pub expires_at: Option<String>,
    pub tier: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
async fn heartbeat(token: String) -> Result<HeartbeatResponse, LicenseError> {
    let cfg = config()?;
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/licenses/heartbeat", cfg.api_base))
        .json(&HeartbeatRequest { token: &token })
        .send()
        .await
        .map_err(|e| LicenseError::Network(e.to_string()))?;
    let parsed = res
        .json::<HeartbeatResponse>()
        .await
        .map_err(|e| LicenseError::Network(e.to_string()))?;
    Ok(parsed)
}

#[derive(Serialize)]
pub struct VerifyLocalResponse {
    pub valid: bool,
    pub error: Option<String>,
    pub product: Option<String>,
    pub tier: Option<String>,
    pub lic_exp: Option<i64>,
    pub jwt_exp: Option<i64>,
}

#[tauri::command]
fn verify_local(token: String) -> VerifyLocalResponse {
    let cfg = match config() {
        Ok(c) => c,
        Err(e) => return error_response(&e.to_string()),
    };
    match license_verify::verify(&token, cfg.public_key_pem) {
        Ok(claims) => {
            if claims.product != cfg.product_slug {
                return error_response("product_mismatch");
            }
            VerifyLocalResponse {
                valid: true,
                error: None,
                product: Some(claims.product),
                tier: Some(claims.tier),
                lic_exp: Some(claims.lic_exp),
                jwt_exp: Some(claims.exp),
            }
        }
        Err(e) => error_response(&e.to_string()),
    }
}

fn error_response(err: &str) -> VerifyLocalResponse {
    VerifyLocalResponse {
        valid: false,
        error: Some(err.to_string()),
        product: None,
        tier: None,
        lic_exp: None,
        jwt_exp: None,
    }
}

const TOKEN_FILE: &str = "license.json";

#[tauri::command]
async fn load_stored_token<R: Runtime>(app: tauri::AppHandle<R>) -> Result<Option<String>, LicenseError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| LicenseError::Storage(e.to_string()))?;
    let path = dir.join(TOKEN_FILE);
    if !path.exists() {
        return Ok(None);
    }
    let content = std::fs::read_to_string(&path).map_err(|e| LicenseError::Storage(e.to_string()))?;
    Ok(Some(content))
}

#[tauri::command]
async fn save_token<R: Runtime>(
    app: tauri::AppHandle<R>,
    token: String,
) -> Result<(), LicenseError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| LicenseError::Storage(e.to_string()))?;
    std::fs::create_dir_all(&dir).map_err(|e| LicenseError::Storage(e.to_string()))?;
    let path = dir.join(TOKEN_FILE);
    std::fs::write(&path, token).map_err(|e| LicenseError::Storage(e.to_string()))?;
    Ok(())
}

#[tauri::command]
async fn clear_token<R: Runtime>(app: tauri::AppHandle<R>) -> Result<(), LicenseError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| LicenseError::Storage(e.to_string()))?;
    let path = dir.join(TOKEN_FILE);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| LicenseError::Storage(e.to_string()))?;
    }
    Ok(())
}
