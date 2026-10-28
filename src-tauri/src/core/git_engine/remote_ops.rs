use crate::core::git_engine::errors::GitEngineError;
use git2::Repository;
use std::process::Command;

pub fn git_fetch(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .arg("fetch")
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git fetch: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_pull(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .arg("pull")
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git pull: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_push(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .arg("push")
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git push: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_stash(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["stash", "push", "-m", "Git-Manager Quick Stash"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git stash: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_stash_pop(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["stash", "pop"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!(
            "git stash pop: {}",
            err
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn create_branch(repo: &Repository, branch_name: &str) -> Result<(), GitEngineError> {
    let head = repo.head()?;
    let target_commit = head.peel_to_commit()?;
    repo.branch(branch_name, &target_commit, false)?;
    Ok(())
}
