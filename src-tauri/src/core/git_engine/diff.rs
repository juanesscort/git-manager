use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::{
    BranchDiffCheckResult, CommitFileChange, DiffDelta, FileStatusKind,
};
use git2::{Delta, DiffFormat, DiffOptions, Oid, Patch, Repository};

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

pub fn check_branch_diff(
    repo: &Repository,
    base: &str,
    head: &str,
) -> Result<BranchDiffCheckResult, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;

    let resolve_ref = |name: &str| -> String {
        let clean = name.strip_prefix("origin/").unwrap_or(name);
        let remote_ref = format!("origin/{}", clean);
        if repo
            .find_reference(&format!("refs/remotes/{}", remote_ref))
            .is_ok()
        {
            remote_ref
        } else {
            clean.to_string()
        }
    };

    let ref_base = resolve_ref(base);
    let ref_head = resolve_ref(head);

    // 1. Check commits count
    let count_output = std::process::Command::new("git")
        .args([
            "rev-list",
            "--count",
            &format!("{}..{}", ref_base, ref_head),
        ])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    let commits_count: usize = if count_output.status.success() {
        String::from_utf8_lossy(&count_output.stdout)
            .trim()
            .parse()
            .unwrap_or(0)
    } else {
        0
    };

    // 2. Get commits log oneline
    let log_output = std::process::Command::new("git")
        .args([
            "log",
            &format!("{}..{}", ref_base, ref_head),
            "--oneline",
            "-n",
            "20",
        ])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    let commits_summary: Vec<String> = if log_output.status.success() {
        String::from_utf8_lossy(&log_output.stdout)
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect()
    } else {
        Vec::new()
    };

    // 3. Get diff shortstat
    let stat_output = std::process::Command::new("git")
        .args([
            "diff",
            "--shortstat",
            &format!("{}...{}", ref_base, ref_head),
        ])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    let stat_summary = if stat_output.status.success() {
        String::from_utf8_lossy(&stat_output.stdout)
            .trim()
            .to_string()
    } else {
        String::new()
    };

    let has_changes = commits_count > 0;
    let is_up_to_date = commits_count == 0;

    Ok(BranchDiffCheckResult {
        has_changes,
        commits_count,
        commits_summary,
        stat_summary,
        is_up_to_date,
    })
}

pub fn get_branch_diff_full(
    repo: &Repository,
    base: &str,
    head: &str,
) -> Result<String, GitEngineError> {
    let workdir = repo.workdir().ok_or(GitEngineError::BareRepository)?;

    let resolve_ref = |name: &str| -> String {
        let clean = name.strip_prefix("origin/").unwrap_or(name);
        let remote_ref = format!("origin/{}", clean);
        if repo
            .find_reference(&format!("refs/remotes/{}", remote_ref))
            .is_ok()
        {
            remote_ref
        } else {
            clean.to_string()
        }
    };

    let ref_base = resolve_ref(base);
    let ref_head = resolve_ref(head);
    let range = format!("{}...{}", ref_base, ref_head);

    let output = std::process::Command::new("git")
        .args(["diff", &range])
        .current_dir(workdir)
        .output()
        .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;

    if !output.status.success() {
        let output2 = std::process::Command::new("git")
            .args(["diff", &ref_base, &ref_head])
            .current_dir(workdir)
            .output()
            .map_err(|e| GitEngineError::GitCommandError(e.to_string()))?;
        return Ok(String::from_utf8_lossy(&output2.stdout).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn get_commit_changed_files(
    repo: &Repository,
    commit_oid: &str,
) -> Result<Vec<CommitFileChange>, GitEngineError> {
    let oid = Oid::from_str(commit_oid).map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;
    let commit = repo.find_commit(oid)?;
    let commit_tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), None)?;
    let mut files = Vec::new();

    for (idx, delta) in diff.deltas().enumerate() {
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        let status = match delta.status() {
            Delta::Added => FileStatusKind::Added,
            Delta::Deleted => FileStatusKind::Deleted,
            Delta::Modified => FileStatusKind::Modified,
            Delta::Renamed => FileStatusKind::Renamed,
            Delta::Untracked => FileStatusKind::Untracked,
            Delta::Conflicted => FileStatusKind::Conflicted,
            _ => FileStatusKind::Modified,
        };

        let mut lines_added = 0;
        let mut lines_deleted = 0;

        if let Some((_, added, deleted)) = Patch::from_diff(&diff, idx)
            .ok()
            .flatten()
            .and_then(|p| p.line_stats().ok())
        {
            lines_added = added;
            lines_deleted = deleted;
        }

        files.push(CommitFileChange {
            path,
            status,
            lines_added,
            lines_deleted,
        });
    }

    Ok(files)
}

pub fn get_commit_file_diff(
    repo: &Repository,
    commit_oid: &str,
    relative_path: &str,
) -> Result<DiffDelta, GitEngineError> {
    let oid = Oid::from_str(commit_oid).map_err(|e| GitEngineError::InvalidPath(e.to_string()))?;
    let commit = repo.find_commit(oid)?;
    let commit_tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(relative_path);

    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&commit_tree),
        Some(&mut diff_opts),
    )?;

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
