use crate::core::git_engine::errors::GitEngineError;
use git2::Repository;
use std::process::Command;

pub fn git_fetch(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["fetch", "--prune"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let raw_err = if !err.trim().is_empty() {
            err.trim()
        } else {
            out.trim()
        };
        return Err(GitEngineError::GitCommandError(raw_err.to_string()));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_pull(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    // Use --no-rebase so divergent branches merge cleanly by default
    let output = Command::new("git")
        .args(["pull", "--no-rebase"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let raw_err = if !err.trim().is_empty() {
            err.trim()
        } else {
            out.trim()
        };

        let helpful_msg = if raw_err.contains("CONFLICT") || raw_err.contains("conflict") {
            format!(
                "Conflicto durante el Pull: Existen cambios incompatibles entre el repositorio remoto y local.\n\n👉 Se han detectado conflictos. Usa el resolvedor visual para solucionarlos.\n\nDetalle técnico:\n{}",
                raw_err
            )
        } else if raw_err.contains("no upstream branch")
            || raw_err.contains("no tracking information")
        {
            format!(
                "La rama actual no tiene una rama remota rastreada para hacer Pull.\n\nDetalle técnico:\n{}",
                raw_err
            )
        } else {
            raw_err.to_string()
        };

        return Err(GitEngineError::GitCommandError(helpful_msg));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_push(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;

    // Check if the active branch has an upstream configured
    let head_branch_name: Option<String> = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().ok().map(|s| s.to_string()));

    let has_upstream = if let Some(ref b_name) = head_branch_name {
        repo.find_branch(b_name, git2::BranchType::Local)
            .ok()
            .and_then(|b| b.upstream().ok())
            .is_some()
    } else {
        false
    };

    let output = if has_upstream {
        Command::new("git")
            .arg("push")
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?
    } else if let Some(ref b_name) = head_branch_name {
        // Automatically publish new local branch with upstream tracking
        Command::new("git")
            .args(["push", "-u", "origin", b_name])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?
    } else {
        Command::new("git")
            .arg("push")
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?
    };

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let raw_err = if !err.trim().is_empty() {
            err.trim()
        } else {
            out.trim()
        };

        let helpful_msg = if raw_err.contains("non-fast-forward")
            || raw_err.contains("Updates were rejected because the remote contains work")
        {
            format!(
                "Push rechazado (non-fast-forward): El repositorio remoto contiene commits nuevos que no tienes localmente.\n\n👉 Solución: Haz clic en el botón 'Pull' para descargar y fusionar los cambios remotos antes de hacer Push.\n\nDetalle técnico:\n{}",
                raw_err
            )
        } else if raw_err.contains("no upstream branch") {
            format!(
                "La rama actual no tiene una rama remota asociada (upstream).\n\nDetalle técnico:\n{}",
                raw_err
            )
        } else if raw_err.contains("Permission to") && raw_err.contains("denied") {
            format!(
                "Permiso denegado por GitHub para escribir en el repositorio remoto.\n\nDetalle técnico:\n{}",
                raw_err
            )
        } else {
            raw_err.to_string()
        };

        return Err(GitEngineError::GitCommandError(helpful_msg));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_stash(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["stash", "push", "-m", "Git-Manager Quick Stash"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::GitCommandError(format!(
            "git stash: {}",
            err
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_stash_pop(repo: &Repository) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["stash", "pop"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(GitEngineError::GitCommandError(format!(
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
    if branch_name.starts_with("origin/") {
        let clean_name = branch_name.strip_prefix("origin/").unwrap_or(branch_name);
        let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
        let output = Command::new("git")
            .args(["push", "origin", "--delete", clean_name])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            let out = String::from_utf8_lossy(&output.stdout);
            let raw_err = if !err.trim().is_empty() {
                err.trim()
            } else {
                out.trim()
            };
            return Err(GitEngineError::GitCommandError(raw_err.to_string()));
        }

        // Prune deleted remote branches locally
        let _ = Command::new("git")
            .args(["fetch", "--prune"])
            .current_dir(workdir)
            .output();

        return Ok(());
    }

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

pub fn git_merge(
    repo: &Repository,
    source_branch: &str,
    target_branch: Option<&str>,
) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;

    // If target branch is specified and is not currently checked out, checkout target first
    if let Some(target) = target_branch.filter(|t| !t.is_empty()) {
        let current = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().ok().map(|s| s.to_string()))
            .unwrap_or_default();
        if current != target {
            let checkout_output = Command::new("git")
                .args(["checkout", target])
                .current_dir(workdir)
                .output()
                .map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;
            if !checkout_output.status.success() {
                let err = String::from_utf8_lossy(&checkout_output.stderr);
                return Err(GitEngineError::InvalidPath(format!(
                    "git checkout {}: {}",
                    target, err
                )));
            }
        }
    }

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

pub fn git_push_tag(repo: &Repository, tag_name: &str) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["push", "origin", tag_name])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let raw_err = if !err.trim().is_empty() {
            err.trim()
        } else {
            out.trim()
        };
        return Err(GitEngineError::GitCommandError(raw_err.to_string()));
    }

    Ok(format!(
        "Etiqueta '{}' subida exitosamente a GitHub.",
        tag_name
    ))
}

pub fn git_get_remote_tags(repo: &Repository) -> Result<Vec<String>, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["ls-remote", "--tags", "origin"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut remote_tags = Vec::new();
    for line in stdout.lines() {
        if let Some((_, refname)) = line.split_once('\t')
            && let Some(tag_name) = refname.strip_prefix("refs/tags/")
        {
            let clean_name = tag_name.trim_end_matches("^{}").to_string();
            if !remote_tags.contains(&clean_name) {
                remote_tags.push(clean_name);
            }
        }
    }

    Ok(remote_tags)
}

pub fn git_delete_remote_tag(repo: &Repository, tag_name: &str) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let output = Command::new("git")
        .args(["push", "origin", "--delete", tag_name])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let raw_err = if !err.trim().is_empty() {
            err.trim()
        } else {
            out.trim()
        };
        return Err(GitEngineError::GitCommandError(raw_err.to_string()));
    }

    Ok(format!(
        "Etiqueta '{}' eliminada de GitHub (origin) exitosamente.",
        tag_name
    ))
}

pub fn git_fetch_tag(repo: &Repository, tag_name: &str) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;
    let refspec = format!("refs/tags/{}:refs/tags/{}", tag_name, tag_name);
    let output = Command::new("git")
        .args(["fetch", "origin", &refspec])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let raw_err = if !err.trim().is_empty() {
            err.trim()
        } else {
            out.trim()
        };
        return Err(GitEngineError::GitCommandError(raw_err.to_string()));
    }

    Ok(format!(
        "Etiqueta '{}' descargada a local exitosamente.",
        tag_name
    ))
}

pub fn list_unified_tags(
    repo: &Repository,
) -> Result<Vec<crate::models::git_models::UnifiedTagItem>, GitEngineError> {
    let local_tags = crate::core::git_engine::tags::list_tags(repo)?;
    let remote_tags = git_get_remote_tags(repo).unwrap_or_default();

    let mut unified: Vec<crate::models::git_models::UnifiedTagItem> = Vec::new();
    let mut seen_remotes = std::collections::HashSet::new();

    for local in local_tags {
        let is_remote = remote_tags.contains(&local.name);
        if is_remote {
            seen_remotes.insert(local.name.clone());
        }
        unified.push(crate::models::git_models::UnifiedTagItem {
            name: local.name,
            target_commit_id: Some(local.target_commit_id),
            short_target_id: Some(local.short_target_id),
            message: local.message,
            tagger_name: local.tagger_name,
            timestamp: local.timestamp,
            is_annotated: local.is_annotated,
            is_local: true,
            is_remote,
        });
    }

    for remote_name in remote_tags {
        if !seen_remotes.contains(&remote_name) {
            unified.push(crate::models::git_models::UnifiedTagItem {
                name: remote_name,
                target_commit_id: None,
                short_target_id: None,
                message: None,
                tagger_name: None,
                timestamp: None,
                is_annotated: false,
                is_local: false,
                is_remote: true,
            });
        }
    }

    unified.sort_by(|a, b| match (a.timestamp, b.timestamp) {
        (Some(ta), Some(tb)) => tb.cmp(&ta),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => a.name.cmp(&b.name),
    });

    Ok(unified)
}
