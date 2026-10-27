use crate::core::git_engine::errors::GitEngineError;
use git2::{Repository, Signature};

pub fn create_commit(
    repo: &Repository,
    message: &str,
    author_name: Option<&str>,
    author_email: Option<&str>,
) -> Result<String, GitEngineError> {
    let trimmed_message = message.trim();
    if trimmed_message.is_empty() {
        return Err(GitEngineError::EmptyCommitMessage);
    }

    // Determine Signature (author and committer)
    let sig = if let (Some(name), Some(email)) = (author_name, author_email) {
        Signature::now(name, email)?
    } else {
        repo.signature().or_else(|_| {
            // Fallback default signature if git config is missing
            Signature::now("Git-Manager User", "user@gitmanager.local")
        })?
    };

    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let commit_oid = match repo.head() {
        Ok(head) => {
            let parent_commit = head.peel_to_commit()?;
            repo.commit(
                Some("HEAD"),
                &sig,
                &sig,
                trimmed_message,
                &tree,
                &[&parent_commit],
            )?
        }
        Err(_) => {
            // Initial commit on an empty repository
            repo.commit(Some("HEAD"), &sig, &sig, trimmed_message, &tree, &[])?
        }
    };

    Ok(commit_oid.to_string())
}
