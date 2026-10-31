pub mod core;
pub mod ipc;
pub mod models;

use ipc::ai_commands::{
    check_branch_diff_cmd, generate_ai_commit, generate_ai_pull_request, get_ai_config,
    review_pull_request_with_ai, save_ai_config,
};
use ipc::check_system_status;
use ipc::conflict_commands::{
    check_repo_conflicts, get_conflict_file_detail, resolve_conflict_file_cmd,
};
use ipc::git_commands::{
    checkout_branch_cmd, clone_repo_cmd, commit_changes_cmd, create_branch_cmd, create_tag_cmd,
    delete_branch_cmd, delete_remote_tag_cmd, delete_tag_cmd, exec_terminal_cmd,
    execute_git_manager_release_cmd, fetch_tag_cmd, get_commit_file_diff_cmd, get_commit_files_cmd,
    get_commits_cmd, get_diff_cmd, get_file_media_cmd, get_project_version_cmd,
    get_remote_tags_cmd, get_repo_branches_cmd, get_repo_info, get_repo_status, get_repo_tags_cmd,
    get_terminal_prompt_info, git_fetch_cmd, git_merge_cmd, git_pull_cmd, git_push_cmd,
    git_rebase_cmd, git_stash_cmd, git_stash_pop_cmd, is_git_manager_repo_cmd,
    list_unified_tags_cmd, pick_folder_dialog_cmd, push_tag_cmd, rename_branch_cmd, stage_all_cmd,
    stage_file_cmd, unstage_all_cmd, unstage_file_cmd, update_tag_cmd,
};
use ipc::github_commands::{
    cancel_workflow_run_cmd, check_github_session, create_pull_request_cmd, dispatch_workflow_cmd,
    get_github_repositories, get_pull_request_checks_cmd, get_pull_request_details_cmd,
    get_repo_permissions_cmd, get_workflow_job_logs_cmd, list_pull_requests_cmd,
    list_repository_workflows_cmd, list_workflow_run_jobs_cmd, list_workflow_runs_cmd,
    logout_github_session, merge_pull_request_cmd, poll_github_device_token,
    rerun_workflow_run_cmd, save_github_token_cmd, start_github_device_flow,
    submit_pull_request_review_cmd,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            get_file_media_cmd,
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
            pick_folder_dialog_cmd,
            clone_repo_cmd,
            exec_terminal_cmd,
            get_terminal_prompt_info,
            start_github_device_flow,
            poll_github_device_token,
            save_github_token_cmd,
            check_github_session,
            logout_github_session,
            get_github_repositories,
            check_branch_diff_cmd,
            generate_ai_commit,
            generate_ai_pull_request,
            create_pull_request_cmd,
            save_ai_config,
            get_ai_config,
            check_repo_conflicts,
            get_conflict_file_detail,
            resolve_conflict_file_cmd,
            get_repo_tags_cmd,
            create_tag_cmd,
            delete_tag_cmd,
            update_tag_cmd,
            push_tag_cmd,
            get_remote_tags_cmd,
            get_repo_permissions_cmd,
            list_pull_requests_cmd,
            get_pull_request_details_cmd,
            get_pull_request_checks_cmd,
            submit_pull_request_review_cmd,
            merge_pull_request_cmd,
            review_pull_request_with_ai,
            list_unified_tags_cmd,
            fetch_tag_cmd,
            delete_remote_tag_cmd,
            is_git_manager_repo_cmd,
            get_project_version_cmd,
            execute_git_manager_release_cmd,
            list_workflow_runs_cmd,
            list_repository_workflows_cmd,
            list_workflow_run_jobs_cmd,
            get_workflow_job_logs_cmd,
            cancel_workflow_run_cmd,
            rerun_workflow_run_cmd,
            dispatch_workflow_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
