//! Motor local de operaciones Git utilizando libgit2 (git2-rs).

pub mod commit;
pub mod diff;
pub mod errors;
pub mod history;
pub mod repository;
pub mod staging;
pub mod status;

#[cfg(test)]
mod tests;

pub use commit::create_commit;
pub use diff::{get_file_diff, get_staged_diff_full};
pub use errors::GitEngineError;
pub use history::get_commit_history;
pub use repository::{get_repo_summary, open_repository};
pub use staging::{stage_all, stage_file, unstage_all, unstage_file};
pub use status::get_repo_statuses;
