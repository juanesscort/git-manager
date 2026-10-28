pub mod core;
pub mod ipc;
pub mod models;

use ipc::ai_commands::{generate_ai_commit, get_ai_config, save_ai_config};
use ipc::check_system_status;
use ipc::conflict_commands::{
    check_repo_conflicts, get_conflict_file_detail, resolve_conflict_file_cmd,
};
use ipc::git_commands::{
    checkout_branch_cmd, commit_changes_cmd, create_branch_cmd, delete_branch_cmd,
    get_commit_file_diff_cmd, get_commit_files_cmd, get_commits_cmd, get_diff_cmd,
    get_repo_branches_cmd, get_repo_info, get_repo_status, git_fetch_cmd, git_merge_cmd,
    git_pull_cmd, git_push_cmd, git_rebase_cmd, git_stash_cmd, git_stash_pop_cmd,
    rename_branch_cmd, stage_all_cmd, stage_file_cmd, unstage_all_cmd, unstage_file_cmd,
};
use ipc::github_commands::{
    check_github_session, get_github_repositories, logout_github_session, poll_github_device_token,
    save_github_token_cmd, start_github_device_flow,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
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
            get_repo_branches_cmd,
            get_commit_files_cmd,
            get_commit_file_diff_cmd,
            git_fetch_cmd,
            git_pull_cmd,
            git_push_cmd,
            git_stash_cmd,
            git_stash_pop_cmd,
            create_branch_cmd,
            checkout_branch_cmd,
            delete_branch_cmd,
            rename_branch_cmd,
            git_merge_cmd,
            git_rebase_cmd,
            start_github_device_flow,
            poll_github_device_token,
            save_github_token_cmd,
            check_github_session,
            logout_github_session,
            get_github_repositories,
            generate_ai_commit,
            save_ai_config,
            get_ai_config,
            check_repo_conflicts,
            get_conflict_file_detail,
            resolve_conflict_file_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
