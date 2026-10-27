use super::config::create_active_provider;
use super::errors::AiServiceError;
use super::sanitizer::sanitize_git_diff;
use crate::core::git_engine::{diff::get_staged_diff_full, open_repository};

pub async fn generate_commit_for_staged(repo_path: &str) -> Result<String, AiServiceError> {
    let repo = open_repository(repo_path)?;
    let raw_diff = get_staged_diff_full(&repo)?;

    if raw_diff.trim().is_empty() {
        return Err(AiServiceError::NoStagedChanges);
    }

    let sanitized_diff = sanitize_git_diff(&raw_diff);
    let provider = create_active_provider()?;

    provider.generate_commit(&sanitized_diff).await
}
