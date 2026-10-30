use super::errors::GitEngineError;
use git2::Repository;
use std::fs;
use std::process::Command;

pub fn is_git_manager_repo(repo: &Repository) -> bool {
    let workdir = match repo.workdir() {
        Some(w) => w,
        None => return false,
    };

    let tauri_conf_path = workdir.join("src-tauri/tauri.conf.json");
    if tauri_conf_path.exists()
        && let Ok(content) = fs::read_to_string(&tauri_conf_path)
        && content.contains("com.juanesscort.gitmanager")
    {
        return true;
    }

    if let Ok(remote) = repo.find_remote("origin")
        && let Ok(url) = remote.url()
        && url.to_lowercase().contains("git-manager")
    {
        return true;
    }

    false
}

pub fn execute_git_manager_release(
    repo: &Repository,
    new_version: &str,
    merge_from_dev: bool,
    push_to_origin: bool,
) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;

    let clean_ver = new_version.trim().trim_start_matches('v');
    if clean_ver.is_empty() || clean_ver.split('.').count() < 3 {
        return Err(GitEngineError::GitCommandError(
            "El formato de versión debe ser semántico (ej: 0.4.1 o 1.0.0)".to_string(),
        ));
    }

    // 1. Verify working directory is clean
    let mut status_opts = git2::StatusOptions::new();
    status_opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut status_opts))?;
    if !statuses.is_empty() {
        return Err(GitEngineError::GitCommandError(
            "El espacio de trabajo tiene cambios pendientes. Realiza commit o stash antes de lanzar una versión.".to_string(),
        ));
    }

    // 2. Merge dev if requested
    if merge_from_dev {
        let checkout_out = Command::new("git")
            .args(["checkout", "main"])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !checkout_out.status.success() {
            let err = String::from_utf8_lossy(&checkout_out.stderr);
            return Err(GitEngineError::GitCommandError(format!(
                "Error al cambiar a rama main: {}",
                err
            )));
        }

        let merge_out = Command::new("git")
            .args(["merge", "dev", "--no-edit"])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !merge_out.status.success() {
            let err = String::from_utf8_lossy(&merge_out.stderr);
            return Err(GitEngineError::GitCommandError(format!(
                "Conflicto o error al fusionar dev en main: {}",
                err
            )));
        }
    }

    // 3. Update package.json using serde_json
    let pkg_path = workdir.join("package.json");
    if pkg_path.exists() {
        let content = fs::read_to_string(&pkg_path)
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
        if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&content) {
            val["version"] = serde_json::Value::String(clean_ver.to_string());
            let updated = serde_json::to_string_pretty(&val)
                .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
            fs::write(&pkg_path, format!("{}\n", updated).as_bytes())
                .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
        }
    }

    // 4. Update src-tauri/Cargo.toml line-by-line
    let cargo_path = workdir.join("src-tauri/Cargo.toml");
    if cargo_path.exists() {
        let content = fs::read_to_string(&cargo_path)
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
        let mut in_package = false;
        let mut updated_lines = Vec::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed == "[package]" {
                in_package = true;
                updated_lines.push(line.to_string());
            } else if in_package && trimmed.starts_with("version =") {
                updated_lines.push(format!(r#"version = "{}""#, clean_ver));
                in_package = false;
            } else {
                updated_lines.push(line.to_string());
            }
        }
        let updated = format!("{}\n", updated_lines.join("\n"));
        fs::write(&cargo_path, updated.as_bytes())
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
    }

    // 5. Update src-tauri/tauri.conf.json using serde_json
    let tauri_path = workdir.join("src-tauri/tauri.conf.json");
    if tauri_path.exists() {
        let content = fs::read_to_string(&tauri_path)
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
        if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&content) {
            val["version"] = serde_json::Value::String(clean_ver.to_string());
            let updated = serde_json::to_string_pretty(&val)
                .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
            fs::write(&tauri_path, format!("{}\n", updated).as_bytes())
                .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
        }
    }

    // 6. Update Cargo.lock using cargo check
    let _ = Command::new("cargo")
        .arg("check")
        .current_dir(workdir.join("src-tauri"))
        .output();

    // 7. Git add and commit
    let add_out = Command::new("git")
        .args([
            "add",
            "package.json",
            "src-tauri/Cargo.toml",
            "src-tauri/tauri.conf.json",
            "src-tauri/Cargo.lock",
        ])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !add_out.status.success() {
        let err = String::from_utf8_lossy(&add_out.stderr);
        return Err(GitEngineError::GitCommandError(format!(
            "Error al agregar archivos de versión a git: {}",
            err
        )));
    }

    let commit_msg = format!("chore(release): v{}", clean_ver);
    let commit_out = Command::new("git")
        .args(["commit", "-m", &commit_msg])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !commit_out.status.success() {
        let err = String::from_utf8_lossy(&commit_out.stderr);
        return Err(GitEngineError::GitCommandError(format!(
            "Error al crear commit de release: {}",
            err
        )));
    }

    // 8. Tag exactly on HEAD
    let tag_name = format!("v{}", clean_ver);
    let tag_out = Command::new("git")
        .args(["tag", &tag_name, "HEAD"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !tag_out.status.success() {
        let err = String::from_utf8_lossy(&tag_out.stderr);
        return Err(GitEngineError::GitCommandError(format!(
            "Error al crear etiqueta git {}: {}",
            tag_name, err
        )));
    }

    // 9. Push if requested
    if push_to_origin {
        let push_branch_out = Command::new("git")
            .args(["push", "origin", "main"])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !push_branch_out.status.success() {
            let err = String::from_utf8_lossy(&push_branch_out.stderr);
            return Err(GitEngineError::GitCommandError(format!(
                "Error al hacer push de main a origin: {}",
                err
            )));
        }

        let push_tag_out = Command::new("git")
            .args(["push", "origin", &tag_name])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !push_tag_out.status.success() {
            let err = String::from_utf8_lossy(&push_tag_out.stderr);
            return Err(GitEngineError::GitCommandError(format!(
                "Error al hacer push del tag {} a origin: {}",
                tag_name, err
            )));
        }
    }

    Ok(format!(
        "Versión v{} liberada exitosamente{}{}.",
        clean_ver,
        if merge_from_dev {
            " (fusionada desde dev)"
        } else {
            ""
        },
        if push_to_origin {
            " y subida a GitHub"
        } else {
            ""
        }
    ))
}
