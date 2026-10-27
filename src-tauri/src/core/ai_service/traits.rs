use super::errors::AiServiceError;
use async_trait::async_trait;

#[async_trait]
pub trait AiCommitProvider: Send + Sync {
    async fn generate_commit(&self, sanitized_diff: &str) -> Result<String, AiServiceError>;
}
