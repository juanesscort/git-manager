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

pub fn create_branch(
    repo: &Repository,
    branch_name: &str,
    base_branch: Option<&str>,
) -> Result<(), GitEngineError> {
    let target_commit = if let Some(base) = base_branch.filter(|s| !s.trim().is_empty()) {
        let rev_spec = format!("refs/heads/{}", base);
        if let Ok(obj) = repo.revparse_single(&rev_spec) {
            obj.peel_to_commit()?
        } else {
            let remote_spec = format!("refs/remotes/{}", base);
            if let Ok(obj) = repo.revparse_single(&remote_spec) {
                obj.peel_to_commit()?
            } else {
                repo.revparse_single(base)?.peel_to_commit()?
            }
        }
    } else {
        let head = repo.head()?;
        head.peel_to_commit()?
    };

    repo.branch(branch_name, &target_commit, false)?;
    Ok(())
}

pub fn delete_branch(repo: &Repository, branch_name: &str) -> Result<(), GitEngineError> {
    let is_current_head = repo
        .head()
        .ok()
        .map(|h| h.shorthand().ok() == Some(branch_name))
        .unwrap_or(false);

    if is_current_head {
        return Err(GitEngineError::InvalidPath(
            "No se puede eliminar la rama activa (HEAD). Cambia a otra rama primero.".to_string(),
        ));
    }

    let mut branch = repo.find_branch(branch_name, git2::BranchType::Local)?;
    branch.delete()?;
    Ok(())
}

pub fn rename_branch(
    repo: &Repository,
    old_name: &str,
    new_name: &str,
) -> Result<(), GitEngineError> {
    let mut branch = repo.find_branch(old_name, git2::BranchType::Local)?;
    branch.rename(new_name, false)?;
    Ok(())
}

pub fn checkout_branch(repo: &Repository, branch_name: &str) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["checkout", branch_name])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!(
            "git checkout: {}",
            err
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_merge(repo: &Repository, source_branch: &str) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["merge", source_branch])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git merge: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_rebase(repo: &Repository, upstream_branch: &str) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["rebase", upstream_branch])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git rebase: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_clone(clone_url: &str, target_path: &str) -> Result<String, GitEngineError> {
    let output = Command::new("git")
        .args(["clone", clone_url, target_path])
        .output()
        .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::InvalidPath(format!("git clone: {}", err)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn pick_folder() -> Result<Option<String>, GitEngineError> {
    let output = Command::new("zenity")
        .args([
            "--file-selection",
            "--directory",
            "--title=Seleccionar repositorio Git",
        ])
        .output();

    if let Ok(out) = output {
        let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if out.status.success() && !path_str.is_empty() {
            return Ok(Some(path_str));
        }
    }

    Ok(None)
}
