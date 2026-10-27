//! Capa delgada de comandos Tauri IPC.

use crate::models::AppStatus;

#[tauri::command]
pub fn check_system_status() -> Result<AppStatus, String> {
    Ok(AppStatus {
        ready: true,
        version: env!("CARGO_PKG_VERSION").to_string(),
        message: "Git-Manager Core & IPC conectados correctamente".to_string(),
    })
}
