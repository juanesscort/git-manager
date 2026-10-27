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
