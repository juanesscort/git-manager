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

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct UndoCommitResult {
    pub undone_commit_oid: String,
    pub undone_commit_message: String,
    pub new_head_oid: String,
}

pub fn undo_commit(
    repo: &Repository,
    keep_staged: bool,
) -> Result<UndoCommitResult, GitEngineError> {
    let head = repo.head()?;
    let current_commit = head.peel_to_commit()?;

    if current_commit.parent_count() == 0 {
        return Err(GitEngineError::GitCommandError(
            "No se puede deshacer el commit inicial porque no tiene un commit padre anterior."
                .to_string(),
        ));
    }

    let parent = current_commit.parent(0)?;
    let undone_oid = current_commit.id().to_string();
    let undone_message = current_commit.message().unwrap_or("").to_string();
    let new_head_oid = parent.id().to_string();

    let reset_type = if keep_staged {
        git2::ResetType::Soft
    } else {
        git2::ResetType::Mixed
    };

    repo.reset(parent.as_object(), reset_type, None)?;

    Ok(UndoCommitResult {
        undone_commit_oid: undone_oid,
        undone_commit_message: undone_message,
        new_head_oid,
    })
}
