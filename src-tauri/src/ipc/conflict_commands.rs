use crate::core::conflict_resolver::{
    extract_conflict_details, list_conflicted_files, resolve_conflicted_file,
};
use crate::core::git_engine::open_repository;
use crate::models::conflict_models::ConflictedFileDetail;

#[tauri::command]
pub async fn check_repo_conflicts(repo_path: String) -> Result<Vec<String>, String> {
    let repo = open_repository(&repo_path).map_err(|e| e.to_string())?;
    list_conflicted_files(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conflict_file_detail(
    repo_path: String,
    relative_path: String,
) -> Result<ConflictedFileDetail, String> {
    let repo = open_repository(&repo_path).map_err(|e| e.to_string())?;
    extract_conflict_details(&repo, &relative_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resolve_conflict_file_cmd(
    repo_path: String,
    relative_path: String,
    resolved_content: String,
) -> Result<(), String> {
    let repo = open_repository(&repo_path).map_err(|e| e.to_string())?;
    resolve_conflicted_file(&repo, &relative_path, &resolved_content).map_err(|e| e.to_string())
}
