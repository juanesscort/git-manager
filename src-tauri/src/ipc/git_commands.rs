use crate::core::git_engine::{
    commit::create_commit,
    diff::get_file_diff,
    history::get_commit_history,
    repository::{get_repo_summary, open_repository},
    staging::{stage_all, stage_file, unstage_all, unstage_file},
    status::get_repo_statuses,
};
use crate::models::git_models::{CommitInfo, DiffDelta, FileStatusItem, RepoSummary};

#[tauri::command]
pub async fn get_repo_info(path: String) -> Result<RepoSummary, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_repo_summary(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_repo_status(path: String) -> Result<Vec<FileStatusItem>, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_repo_statuses(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_file_cmd(path: String, relative_path: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    stage_file(&repo, &relative_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unstage_file_cmd(path: String, relative_path: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    unstage_file(&repo, &relative_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_all_cmd(path: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    stage_all(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unstage_all_cmd(path: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    unstage_all(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_diff_cmd(
    path: String,
    relative_path: String,
    staged: bool,
) -> Result<DiffDelta, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_file_diff(&repo, &relative_path, staged).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn commit_changes_cmd(path: String, message: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    create_commit(&repo, &message, None, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commits_cmd(
    path: String,
    max_count: Option<usize>,
) -> Result<Vec<CommitInfo>, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_commit_history(&repo, max_count.unwrap_or(50)).map_err(|e| e.to_string())
}
