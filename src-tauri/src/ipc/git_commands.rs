use crate::core::git_engine::{
    commit::create_commit,
    diff::{get_commit_changed_files, get_commit_file_diff, get_file_diff},
    get_branches, get_file_media_preview,
    history::get_commit_history,
    remote_ops::{
        checkout_branch, create_branch, delete_branch, git_clone, git_fetch, git_get_remote_tags,
        git_merge, git_pull, git_push, git_push_tag, git_rebase, git_stash, git_stash_pop,
        pick_folder, rename_branch,
    },
    repository::{get_repo_summary, open_repository},
    staging::{stage_all, stage_file, unstage_all, unstage_file},
    status::get_repo_statuses,
    tags::{create_tag, delete_tag, list_tags},
};
use crate::models::git_models::{
    BranchesSummary, CommitFileChange, CommitInfo, DiffDelta, FileMediaPreview, FileStatusItem,
    GitTagDto, RepoSummary,
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
pub async fn get_file_media_cmd(
    path: String,
    relative_path: String,
    commit_oid: Option<String>,
    staged: Option<bool>,
) -> Result<FileMediaPreview, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    get_file_media_preview(&repo, &relative_path, commit_oid.as_deref(), staged)
        .map_err(|e| e.to_string())
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
pub async fn create_branch_cmd(
    path: String,
    branch_name: String,
    base_branch: Option<String>,
) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    create_branch(&repo, &branch_name, base_branch.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_branch_cmd(path: String, branch_name: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    delete_branch(&repo, &branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_branch_cmd(
    path: String,
    old_name: String,
    new_name: String,
) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    rename_branch(&repo, &old_name, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn checkout_branch_cmd(path: String, branch_name: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    checkout_branch(&repo, &branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_merge_cmd(
    path: String,
    source_branch: String,
    target_branch: Option<String>,
) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_merge(&repo, &source_branch, target_branch.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_rebase_cmd(path: String, upstream_branch: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_rebase(&repo, &upstream_branch).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_folder_dialog_cmd() -> Result<Option<String>, String> {
    pick_folder().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clone_repo_cmd(clone_url: String, target_path: String) -> Result<String, String> {
    git_clone(&clone_url, &target_path).map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct TerminalExecResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub user: String,
    pub hostname: String,
}

#[tauri::command]
pub async fn exec_terminal_cmd(cwd: String, command: String) -> Result<TerminalExecResult, String> {
    let output = std::process::Command::new("bash")
        .arg("-c")
        .arg(&command)
        .current_dir(&cwd)
        .output()
        .map_err(|e| format!("Error ejecutando comando en terminal: {}", e))?;

    let user = std::env::var("USER").unwrap_or_else(|_| "user".to_string());
    let hostname = std::process::Command::new("hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "linux".to_string());

    Ok(TerminalExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        user,
        hostname,
    })
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct TerminalPromptInfo {
    pub user: String,
    pub hostname: String,
}

#[tauri::command]
pub fn get_terminal_prompt_info() -> TerminalPromptInfo {
    let user = std::env::var("USER").unwrap_or_else(|_| "user".to_string());
    let hostname = std::process::Command::new("hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "linux".to_string());

    TerminalPromptInfo { user, hostname }
}

#[tauri::command]
pub async fn get_repo_tags_cmd(path: String) -> Result<Vec<GitTagDto>, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    list_tags(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag_cmd(
    path: String,
    name: String,
    target_commit: String,
    message: Option<String>,
) -> Result<GitTagDto, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    create_tag(&repo, &name, &target_commit, message.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_tag_cmd(path: String, name: String) -> Result<(), String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    delete_tag(&repo, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn push_tag_cmd(path: String, tag_name: String) -> Result<String, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_push_tag(&repo, &tag_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_remote_tags_cmd(path: String) -> Result<Vec<String>, String> {
    let repo = open_repository(&path).map_err(|e| e.to_string())?;
    git_get_remote_tags(&repo).map_err(|e| e.to_string())
}
