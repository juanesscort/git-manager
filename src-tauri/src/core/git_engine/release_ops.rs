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

pub fn get_project_version(repo: &Repository) -> Option<String> {
    let workdir = repo.workdir()?;
    let pkg_path = workdir.join("package.json");
    if let Ok(content) = fs::read_to_string(&pkg_path)
        && let Ok(val) = serde_json::from_str::<serde_json::Value>(&content)
        && let Some(v) = val.get("version").and_then(|v| v.as_str())
    {
        return Some(v.to_string());
    }
    None
}

pub fn execute_git_manager_release(
    repo: &Repository,
    tag_name: &str,
    release_notes: &str,
    merge_from_dev: bool,
    push_to_origin: bool,
) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;

    let clean_tag = tag_name.trim();
    if clean_tag.is_empty() {
        return Err(GitEngineError::GitCommandError(
            "El nombre de la etiqueta no puede estar vacío (ej: v0.4.0)".to_string(),
        ));
    }
    let formatted_tag = if clean_tag.starts_with('v') {
        clean_tag.to_string()
    } else {
        format!("v{}", clean_tag)
    };

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

    // 3. Verify tag does not already exist locally
    if repo.revparse_single(&formatted_tag).is_ok() {
        return Err(GitEngineError::GitCommandError(format!(
            "La etiqueta '{}' ya existe en este repositorio.",
            formatted_tag
        )));
    }

    // 4. Create annotated tag on HEAD
    let tag_message = if release_notes.trim().is_empty() {
        format!("Release {}", formatted_tag)
    } else {
        release_notes.trim().to_string()
    };

    let tag_out = Command::new("git")
        .args(["tag", "-a", &formatted_tag, "-m", &tag_message, "HEAD"])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !tag_out.status.success() {
        let err = String::from_utf8_lossy(&tag_out.stderr);
        return Err(GitEngineError::GitCommandError(format!(
            "Error al crear etiqueta git {}: {}",
            formatted_tag, err
        )));
    }

    // 5. Push if requested
    if push_to_origin {
        let head = repo.head()?;
        let branch_name = head.shorthand().unwrap_or("main");

        let push_branch_out = Command::new("git")
            .args(["push", "origin", branch_name])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !push_branch_out.status.success() {
            let err = String::from_utf8_lossy(&push_branch_out.stderr);
            return Err(GitEngineError::GitCommandError(format!(
                "Error al hacer push de la rama '{}' a origin: {}",
                branch_name, err
            )));
        }

        let push_tag_out = Command::new("git")
            .args(["push", "origin", &formatted_tag])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

        if !push_tag_out.status.success() {
            let err = String::from_utf8_lossy(&push_tag_out.stderr);
            return Err(GitEngineError::GitCommandError(format!(
                "Error al hacer push de la etiqueta '{}' a origin: {}",
                formatted_tag, err
            )));
        }
    }

    Ok(format!(
        "Release {} creada exitosamente{}{}.",
        formatted_tag,
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    fn create_test_repo_with_commit() -> (tempfile::TempDir, Repository) {
        let dir = tempdir().expect("crear tempdir");
        let repo = Repository::init(dir.path()).expect("init repo");

        let mut config = repo.config().expect("repo config");
        config.set_str("user.name", "Test User").expect("set name");
        config
            .set_str("user.email", "test@example.com")
            .expect("set email");

        let file_path = dir.path().join("package.json");
        let mut file = File::create(&file_path).expect("create file");
        file.write_all(b"{\"version\": \"0.4.0\"}")
            .expect("write content");

        let mut index = repo.index().expect("get index");
        index
            .add_path(std::path::Path::new("package.json"))
            .expect("add path");
        index.write().expect("write index");

        let tree_id = index.write_tree().expect("write tree");
        {
            let tree = repo.find_tree(tree_id).expect("find tree");
            let sig = repo.signature().expect("signature");
            repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
                .expect("commit");
        }

        (dir, repo)
    }

    #[test]
    fn test_get_project_version() {
        let (_dir, repo) = create_test_repo_with_commit();
        let version = get_project_version(&repo);
        assert_eq!(version, Some("0.4.0".to_string()));
    }

    #[test]
    fn test_execute_release_clean_and_tag() {
        let (_dir, repo) = create_test_repo_with_commit();

        let result = execute_git_manager_release(&repo, "0.4.0", "Notas de v0.4.0", false, false);
        assert!(result.is_ok());

        let tag = repo.revparse_single("v0.4.0");
        assert!(tag.is_ok());

        // Attempting to release the same tag should fail with message that it already exists
        let dup_result = execute_git_manager_release(&repo, "v0.4.0", "", false, false);
        assert!(dup_result.is_err());
    }

    #[test]
    fn test_execute_release_fails_when_dirty() {
        let (dir, repo) = create_test_repo_with_commit();

        // Make repo dirty
        let file_path = dir.path().join("dirty.txt");
        let mut file = File::create(&file_path).expect("create dirty file");
        file.write_all(b"dirty").expect("write dirty");

        let result = execute_git_manager_release(&repo, "0.4.1", "", false, false);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("cambios pendientes")
        );
    }
}
