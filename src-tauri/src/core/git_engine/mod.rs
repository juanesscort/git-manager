//! Motor local de operaciones Git utilizando libgit2 (git2-rs).

pub mod branches;
pub mod commit;
pub mod diff;
pub mod errors;
pub mod history;
pub mod media;
pub mod remote_ops;
pub mod repository;
pub mod staging;
pub mod status;
pub mod tags;

#[cfg(test)]
mod tests;

pub use branches::get_branches;
pub use commit::create_commit;
pub use diff::{
    check_branch_diff, get_branch_diff_full, get_commit_changed_files, get_commit_file_diff,
    get_file_diff, get_staged_diff_full,
};
pub use errors::GitEngineError;
pub use history::get_commit_history;
pub use media::get_file_media_preview;
pub use remote_ops::{
    checkout_branch, create_branch, delete_branch, git_clone, git_fetch, git_get_remote_tags,
    git_merge, git_pull, git_push, git_push_tag, git_rebase, git_stash, git_stash_pop, pick_folder,
    rename_branch,
};
pub use repository::{get_repo_summary, open_repository};
pub use staging::{stage_all, stage_file, unstage_all, unstage_file};
pub use status::get_repo_statuses;
pub use tags::{create_tag, delete_tag, list_tags, update_tag};
