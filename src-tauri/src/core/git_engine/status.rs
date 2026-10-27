use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::{FileStatusItem, FileStatusKind};
use git2::{Repository, Status, StatusOptions};

pub fn get_repo_statuses(repo: &Repository) -> Result<Vec<FileStatusItem>, GitEngineError> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true);

    let statuses = repo.statuses(Some(&mut opts))?;
    let mut items = Vec::new();

    for entry in statuses.iter() {
        let path = match entry.path() {
            Ok(p) => p.to_string(),
            Err(_) => continue,
        };

        let status = entry.status();
        let is_conflicted = status.contains(Status::CONFLICTED);

        // Analyze Staged Status (Index)
        let staged_status = if status.contains(Status::INDEX_NEW) {
            Some(FileStatusKind::Added)
        } else if status.contains(Status::INDEX_MODIFIED) {
            Some(FileStatusKind::Modified)
        } else if status.contains(Status::INDEX_DELETED) {
            Some(FileStatusKind::Deleted)
        } else if status.contains(Status::INDEX_RENAMED) {
            Some(FileStatusKind::Renamed)
        } else {
            None
        };

        // Analyze Unstaged Status (Working Tree)
        let unstaged_status = if status.contains(Status::WT_NEW) {
            Some(FileStatusKind::Untracked)
        } else if status.contains(Status::WT_MODIFIED) {
            Some(FileStatusKind::Modified)
        } else if status.contains(Status::WT_DELETED) {
            Some(FileStatusKind::Deleted)
        } else if status.contains(Status::WT_RENAMED) {
            Some(FileStatusKind::Renamed)
        } else {
            None
        };

        items.push(FileStatusItem {
            path,
            staged_status,
            unstaged_status,
            is_conflicted,
        });
    }

    Ok(items)
}
