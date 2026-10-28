use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::CommitInfo;
use git2::{Repository, Sort};

pub fn get_commit_history(
    repo: &Repository,
    max_count: usize,
) -> Result<Vec<CommitInfo>, GitEngineError> {
    if repo.is_empty().unwrap_or(false) || repo.head().is_err() {
        return Ok(Vec::new());
    }

    let mut revwalk = repo.revwalk()?;
    let _ = revwalk.push_head();
    let _ = revwalk.push_glob("refs/heads/*");
    let _ = revwalk.push_glob("refs/remotes/*");
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)?;

    let mut commits = Vec::new();

    for oid_result in revwalk.take(max_count) {
        let oid = oid_result?;
        let commit = repo.find_commit(oid)?;

        let author = commit.author();
        let author_name = author.name().unwrap_or("Unknown").to_string();
        let author_email = author.email().unwrap_or("unknown@domain.com").to_string();
        let timestamp = commit.time().seconds();

        let summary = commit.summary().ok().flatten().unwrap_or("").to_string();
        let message = commit.message().unwrap_or("").to_string();

        let parent_oids = commit
            .parent_ids()
            .map(|parent_id| parent_id.to_string())
            .collect();

        let full_oid = oid.to_string();
        let short_oid = if full_oid.len() >= 7 {
            full_oid[..7].to_string()
        } else {
            full_oid.clone()
        };

        commits.push(CommitInfo {
            oid: full_oid,
            short_oid,
            summary,
            message,
            author_name,
            author_email,
            timestamp,
            parent_oids,
        });
    }

    Ok(commits)
}
