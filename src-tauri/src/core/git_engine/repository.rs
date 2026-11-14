use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::RepoSummary;
use git2::Repository;
use std::path::Path;

pub fn open_repository<P: AsRef<Path>>(path: P) -> Result<Repository, GitEngineError> {
    let p = path.as_ref();
    let s = p.to_string_lossy();
    if s.trim().is_empty() || s.trim() == "." || !p.is_absolute() {
        return Err(GitEngineError::InvalidPath(
            "Ruta de repositorio no válida o no es absoluta".to_string(),
        ));
    }

    Repository::open(p)
        .or_else(|_| Repository::discover(p))
        .map_err(|e| {
            if e.code() == git2::ErrorCode::NotFound {
                GitEngineError::NotFound(s.to_string())
            } else {
                GitEngineError::Git(e)
            }
        })
}

pub fn get_repo_summary(repo: &Repository) -> Result<RepoSummary, GitEngineError> {
    let path = repo
        .workdir()
        .or_else(|| repo.path().parent())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| repo.path().to_string_lossy().to_string());

    let is_bare = repo.is_bare();
    let is_empty = repo.is_empty().unwrap_or(false);

    let mut current_branch = None;
    let mut head_commit_oid = None;

    if let Ok(head) = repo.head() {
        if head.is_branch() {
            current_branch = head.shorthand().ok().map(|s| s.to_string());
        }
        if let Ok(commit) = head.peel_to_commit() {
            head_commit_oid = Some(commit.id().to_string());
        }
    }

    let remote_url = if let Ok(remote) = repo.find_remote("origin") {
        remote.url().ok().map(|s| s.to_string())
    } else {
        None
    };

    Ok(RepoSummary {
        path,
        current_branch,
        is_empty,
        is_bare,
        head_commit_oid,
        remote_url,
    })
}
