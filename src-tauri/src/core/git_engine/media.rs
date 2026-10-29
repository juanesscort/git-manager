use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::FileMediaPreview;
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use git2::{Oid, Repository};
use std::path::Path;

pub fn get_file_media_preview(
    repo: &Repository,
    relative_path: &str,
    commit_oid: Option<&str>,
    staged: Option<bool>,
) -> Result<FileMediaPreview, GitEngineError> {
    let ext = Path::new(relative_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let (mime_type, mut is_image, is_svg, mut is_lottie) = match ext.as_str() {
        "png" => ("image/png", true, false, false),
        "jpg" | "jpeg" => ("image/jpeg", true, false, false),
        "gif" => ("image/gif", true, false, false),
        "webp" => ("image/webp", true, false, false),
        "svg" => ("image/svg+xml", true, true, false),
        "ico" => ("image/x-icon", true, false, false),
        "bmp" => ("image/bmp", true, false, false),
        "avif" => ("image/avif", true, false, false),
        "lottie" => ("application/json", false, false, true),
        "json" => ("application/json", false, false, false),
        "mp4" => ("video/mp4", false, false, false),
        "webm" => ("video/webm", false, false, false),
        "mp3" => ("audio/mpeg", false, false, false),
        "wav" => ("audio/wav", false, false, false),
        "pdf" => ("application/pdf", false, false, false),
        _ => ("application/octet-stream", false, false, false),
    };

    // 1. Read Current File Bytes
    let (current_bytes, old_bytes) = if let Some(cid) = commit_oid {
        let oid = Oid::from_str(cid).map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;
        let commit = repo.find_commit(oid)?;
        let tree = commit.tree()?;
        let entry = tree.get_path(Path::new(relative_path))?;
        let blob = repo.find_blob(entry.id())?;
        let current = blob.content().to_vec();

        let old = if commit.parent_count() > 0 {
            if let Ok(parent) = commit.parent(0) {
                if let Ok(parent_tree) = parent.tree() {
                    if let Ok(parent_entry) = parent_tree.get_path(Path::new(relative_path)) {
                        if let Ok(parent_blob) = repo.find_blob(parent_entry.id()) {
                            Some(parent_blob.content().to_vec())
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        (current, old)
    } else {
        // Working directory or Staged
        let current = if staged.unwrap_or(false) {
            let index = repo.index()?;
            if let Some(entry) = index.get_path(Path::new(relative_path), 0) {
                let blob = repo.find_blob(entry.id)?;
                blob.content().to_vec()
            } else {
                Vec::new()
            }
        } else {
            let workdir = repo
                .workdir()
                .ok_or_else(|| GitEngineError::InvalidPath("No working directory".into()))?;
            let full_path = workdir.join(relative_path);
            if full_path.exists() {
                std::fs::read(&full_path).map_err(GitEngineError::Io)?
            } else {
                Vec::new()
            }
        };

        // Try reading previous version from HEAD
        let old = if let Ok(head_tree) = repo.head().and_then(|h| h.peel_to_tree()) {
            if let Ok(entry) = head_tree.get_path(Path::new(relative_path)) {
                if let Ok(blob) = repo.find_blob(entry.id()) {
                    Some(blob.content().to_vec())
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        (current, old)
    };

    // If it's a JSON file, check if it has Lottie animation markers
    if ext == "json" && !current_bytes.is_empty() {
        let is_valid_lottie = std::str::from_utf8(&current_bytes).is_ok_and(|text| {
            text.contains("\"v\"")
                && text.contains("\"fr\"")
                && text.contains("\"ip\"")
                && text.contains("\"op\"")
                && text.contains("\"layers\"")
        });
        if is_valid_lottie {
            is_lottie = true;
        }
    }

    // Force is_image to true for SVG / image types
    if is_svg {
        is_image = true;
    }

    let size_bytes = current_bytes.len();
    let old_size_bytes = old_bytes.as_ref().map(|b| b.len());

    let data_base64 = STANDARD.encode(&current_bytes);
    let old_data_base64 = old_bytes.map(|b| STANDARD.encode(&b));

    Ok(FileMediaPreview {
        path: relative_path.to_string(),
        mime_type: mime_type.to_string(),
        data_base64,
        old_data_base64,
        size_bytes,
        old_size_bytes,
        is_svg,
        is_lottie,
        is_image,
    })
}
