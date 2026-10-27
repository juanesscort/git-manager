pub mod core;
pub mod ipc;
pub mod models;

use ipc::check_system_status;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, check_system_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
