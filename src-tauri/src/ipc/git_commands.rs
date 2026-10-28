use crate::core::git_engine::{
    commit::create_commit,
    diff::{get_commit_changed_files, get_commit_file_diff, get_file_diff},
    get_branches,
    history::get_commit_history,
    remote_ops::{
        checkout_branch, create_branch, git_fetch, git_merge, git_pull, git_push, git_rebase,
        git_stash, git_stash_pop,
    },
    repository::{get_repo_summary, open_repository},
    staging::{stage_all, stage_file, unstage_all, unstage_file},
    status::get_repo_statuses,
};
use crate::models::git_models::{
    BranchesSummary, CommitFileChange, CommitInfo, DiffDelta, FileStatusItem, RepoSummary,
};

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

#[tauri::command]
pub async fn get_repo_branches_cmd(path: String) -> Result<BranchesSummary, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_branches(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commit_files_cmd(
    path: String,
    commit_oid: String,
) -> Result<Vec<CommitFileChange>, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_commit_changed_files(&repo, &commit_oid).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commit_file_diff_cmd(
    path: String,
    commit_oid: String,
    relative_path: String,
) -> Result<DiffDelta, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_commit_file_diff(&repo, &commit_oid, &relative_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_fetch_cmd(path: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_fetch(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_pull_cmd(path: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_pull(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_push_cmd(path: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_push(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_stash_cmd(path: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_stash(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_stash_pop_cmd(path: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_stash_pop(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_branch_cmd(path: String, branch_name: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    create_branch(&repo, &branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn checkout_branch_cmd(path: String, branch_name: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    checkout_branch(&repo, &branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_merge_cmd(path: String, source_branch: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_merge(&repo, &source_branch).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_rebase_cmd(path: String, upstream_branch: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_rebase(&repo, &upstream_branch).map_err(|e| e.to_string())
}
