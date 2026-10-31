use crate::core::git_engine::errors::GitEngineError;
use git2::{IndexAddOption, Repository};
use std::path::Path;

pub fn stage_file(repo: &Repository, relative_path: &str) -> Result<(), GitEngineError> {
    let mut index = repo.index()?;
    let path = Path::new(relative_path);
    let workdir = repo.workdir().ok_or_else(|| {
        GitEngineError::InvalidPath("No se puede hacer stage en un repositorio bare".to_string())
    })?;

    let full_path = workdir.join(path);

    if full_path.exists() {
        index.add_path(path)?;
    } else {
        // File was deleted from disk, remove from index
        index.remove_path(path)?;
    }

    index.write()?;
    Ok(())
}

pub fn unstage_file(repo: &Repository, relative_path: &str) -> Result<(), GitEngineError> {
    let path = Path::new(relative_path);

    if let Ok(head) = repo.head() {
        let commit = head.peel_to_commit()?;
        let tree = commit.tree()?;
        repo.reset_default(Some(&tree.into_object()), [path])?;
    } else {
        // In an initial commit without HEAD, removing from index unstages it
        let mut index = repo.index()?;
        index.remove_path(path)?;
        index.write()?;
    }

    Ok(())
}

pub fn stage_all(repo: &Repository) -> Result<(), GitEngineError> {
    let mut index = repo.index()?;
    index.add_all(["*"], IndexAddOption::DEFAULT, None)?;
    index.update_all(["*"], None)?;
    index.write()?;
    Ok(())
}

pub fn unstage_all(repo: &Repository) -> Result<(), GitEngineError> {
    if let Ok(head) = repo.head() {
        let commit = head.peel_to_commit()?;
        let tree = commit.tree()?;
        repo.reset_default(Some(&tree.into_object()), ["*"])?;
    } else {
        let mut index = repo.index()?;
        index.clear()?;
        index.write()?;
    }
    Ok(())
}

pub fn discard_unstaged_file(repo: &Repository, relative_path: &str) -> Result<(), GitEngineError> {
    let path = Path::new(relative_path);
    let workdir = repo.workdir().ok_or_else(|| {
        GitEngineError::InvalidPath(
            "No se puede descartar cambios en un repositorio bare".to_string(),
        )
    })?;
    let full_path = workdir.join(path);

    let status = repo.status_file(path)?;

    if status.contains(git2::Status::WT_NEW) {
        if full_path.is_file() {
            std::fs::remove_file(&full_path)?;
        } else if full_path.is_dir() {
            std::fs::remove_dir_all(&full_path)?;
        }
    } else {
        let mut checkout = git2::build::CheckoutBuilder::new();
        checkout.path(path).force();
        repo.checkout_index(None, Some(&mut checkout))?;
    }

    Ok(())
}

pub fn discard_all_unstaged(repo: &Repository) -> Result<(), GitEngineError> {
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);

    let statuses = repo.statuses(Some(&mut opts))?;
    let workdir = repo.workdir().ok_or_else(|| {
        GitEngineError::InvalidPath(
            "No se puede descartar cambios en un repositorio bare".to_string(),
        )
    })?;

    let mut has_tracked_changes = false;

    for entry in statuses.iter() {
        let status = entry.status();
        let path_str = match entry.path() {
            Ok(p) => p,
            Err(_) => continue,
        };

        if status.contains(git2::Status::WT_NEW) {
            let full_path = workdir.join(path_str);
            if full_path.is_file() {
                let _ = std::fs::remove_file(&full_path);
            } else if full_path.is_dir() {
                let _ = std::fs::remove_dir_all(&full_path);
            }
        } else if status.contains(git2::Status::WT_MODIFIED)
            || status.contains(git2::Status::WT_DELETED)
            || status.contains(git2::Status::WT_RENAMED)
        {
            has_tracked_changes = true;
        }
    }

    if has_tracked_changes {
        let mut checkout = git2::build::CheckoutBuilder::new();
        checkout.force();
        repo.checkout_index(None, Some(&mut checkout))?;
    }

    Ok(())
}
