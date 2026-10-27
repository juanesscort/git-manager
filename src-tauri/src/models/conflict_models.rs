use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictBlock {
    pub id: usize,
    pub ours: String,
    pub theirs: String,
    pub base: String,
    pub start_line: usize,
    pub end_line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictedFileDetail {
    pub path: String,
    pub ours_content: String,
    pub theirs_content: String,
    pub base_content: String,
    pub current_workdir_content: String,
    pub blocks: Vec<ConflictBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolveConflictRequest {
    pub repo_path: String,
    pub relative_path: String,
    pub resolved_content: String,
}
