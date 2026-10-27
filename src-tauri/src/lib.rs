pub mod core;
pub mod ipc;
pub mod models;

use ipc::check_system_status;
use ipc::git_commands::{
    commit_changes_cmd, get_commits_cmd, get_diff_cmd, get_repo_info, get_repo_status,
    stage_all_cmd, stage_file_cmd, unstage_all_cmd, unstage_file_cmd,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_system_status,
            get_repo_info,
            get_repo_status,
            stage_file_cmd,
            unstage_file_cmd,
            stage_all_cmd,
            unstage_all_cmd,
            get_diff_cmd,
            commit_changes_cmd,
            get_commits_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
