use super::errors::ConflictError;
use crate::models::conflict_models::{ConflictBlock, ConflictedFileDetail};
use git2::{IndexEntry, Repository};
use std::fs;
use std::path::Path;

fn read_entry_blob(repo: &Repository, entry: Option<&IndexEntry>) -> String {
    if let Some(blob) = entry.and_then(|e| repo.find_blob(e.id).ok()) {
        return String::from_utf8_lossy(blob.content()).to_string();
    }
    String::new()
}

pub fn extract_conflict_details(
    repo: &Repository,
    relative_path: &str,
) -> Result<ConflictedFileDetail, ConflictError> {
    let index = repo.index()?;
    let workdir = repo.workdir().ok_or(ConflictError::BareRepository)?;
    let full_path = workdir.join(Path::new(relative_path));

    let workdir_content = if full_path.exists() {
        fs::read_to_string(&full_path).unwrap_or_default()
    } else {
        String::new()
    };

    let mut base_content = String::new();
    let mut ours_content = String::new();
    let mut theirs_content = String::new();

    let conflicts = index.conflicts()?;
    for conflict_res in conflicts {
        let conflict = conflict_res?;
        let matches_path = conflict
            .our
            .as_ref()
            .and_then(|e| std::str::from_utf8(&e.path).ok())
            .map(|p| p == relative_path)
            .unwrap_or(false)
            || conflict
                .their
                .as_ref()
                .and_then(|e| std::str::from_utf8(&e.path).ok())
                .map(|p| p == relative_path)
                .unwrap_or(false);

        if matches_path {
            base_content = read_entry_blob(repo, conflict.ancestor.as_ref());
            ours_content = read_entry_blob(repo, conflict.our.as_ref());
            theirs_content = read_entry_blob(repo, conflict.their.as_ref());
            break;
        }
    }

    // Parse conflict markers in workdir file: <<<<<<<, =======, >>>>>>>
    let blocks = parse_conflict_markers(&workdir_content);

    Ok(ConflictedFileDetail {
        path: relative_path.to_string(),
        ours_content,
        theirs_content,
        base_content,
        current_workdir_content: workdir_content,
        blocks,
    })
}

pub fn parse_conflict_markers(content: &str) -> Vec<ConflictBlock> {
    let mut blocks = Vec::new();
    let mut in_conflict = false;
    let mut in_theirs = false;

    let mut current_ours = Vec::new();
    let mut current_theirs = Vec::new();
    let mut start_line = 0;
    let mut block_id = 0;

    for (idx, line) in content.lines().enumerate() {
        if line.starts_with("<<<<<<<") {
            in_conflict = true;
            in_theirs = false;
            start_line = idx + 1;
            current_ours.clear();
            current_theirs.clear();
        } else if in_conflict && line.starts_with("=======") {
            in_theirs = true;
        } else if in_conflict && line.starts_with(">>>>>>>") {
            in_conflict = false;
            in_theirs = false;
            block_id += 1;

            blocks.push(ConflictBlock {
                id: block_id,
                ours: current_ours.join("\n"),
                theirs: current_theirs.join("\n"),
                base: String::new(),
                start_line,
                end_line: idx + 1,
            });

            current_ours.clear();
            current_theirs.clear();
        } else if in_conflict {
            if in_theirs {
                current_theirs.push(line);
            } else {
                current_ours.push(line);
            }
        }
    }

    blocks
}
