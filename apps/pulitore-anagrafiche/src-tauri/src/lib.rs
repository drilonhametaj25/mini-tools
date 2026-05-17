use tauri_license_plugin::{init as license_init, LicenseConfig};

const PUBLIC_KEY_PEM: &[u8] = include_bytes!("../../../../crates/license-verify/public-key.pem");

const API_BASE: &str = if cfg!(debug_assertions) {
    "http://localhost:3100"
} else {
    "https://drilonhametaj.it"
};

const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(license_init(LicenseConfig {
            product_slug: "pulitore-anagrafiche",
            api_base: API_BASE,
            public_key_pem: PUBLIC_KEY_PEM,
            app_version: APP_VERSION,
        }))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
