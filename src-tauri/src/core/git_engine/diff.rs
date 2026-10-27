use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::DiffDelta;
use git2::{DiffFormat, DiffOptions, Repository};

pub fn get_file_diff(
    repo: &Repository,
    relative_path: &str,
    staged: bool,
) -> Result<DiffDelta, GitEngineError> {
    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(relative_path);

    let diff = if staged {
        let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_opts))?
    } else {
        repo.diff_index_to_workdir(None, Some(&mut diff_opts))?
    };

    let mut patch_output = Vec::new();
    let mut lines_added = 0;
    let mut lines_deleted = 0;

    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        match line.origin() {
            '+' => {
                lines_added += 1;
                patch_output.push(b'+');
            }
            '-' => {
                lines_deleted += 1;
                patch_output.push(b'-');
            }
            ' ' => {
                patch_output.push(b' ');
            }
            _ => {}
        }
        patch_output.extend_from_slice(line.content());
        true
    })?;

    Ok(DiffDelta {
        path: relative_path.to_string(),
        patch: String::from_utf8_lossy(&patch_output).to_string(),
        lines_added,
        lines_deleted,
    })
}

pub fn get_staged_diff_full(repo: &Repository) -> Result<String, GitEngineError> {
    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_opts))?;

    let mut patch_output = Vec::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        match line.origin() {
            '+' => patch_output.push(b'+'),
            '-' => patch_output.push(b'-'),
            ' ' => patch_output.push(b' '),
            _ => {}
        }
        patch_output.extend_from_slice(line.content());
        true
    })?;

    Ok(String::from_utf8_lossy(&patch_output).to_string())
}
