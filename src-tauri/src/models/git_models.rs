use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum FileStatusKind {
    Untracked,
    Modified,
    Deleted,
    Added,
    Renamed,
    Conflicted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileStatusItem {
    pub path: String,
    pub staged_status: Option<FileStatusKind>,
    pub unstaged_status: Option<FileStatusKind>,
    pub is_conflicted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoSummary {
    pub path: String,
    pub current_branch: Option<String>,
    pub is_empty: bool,
    pub is_bare: bool,
    pub head_commit_oid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitInfo {
    pub oid: String,
    pub short_oid: String,
    pub summary: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub parent_oids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffDelta {
    pub path: String,
    pub patch: String,
    pub lines_added: usize,
    pub lines_deleted: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
    pub target_oid: String,
    pub is_remote: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchesSummary {
    pub local: Vec<BranchInfo>,
    pub remote: Vec<BranchInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitFileChange {
    pub path: String,
    pub status: FileStatusKind,
    pub lines_added: usize,
    pub lines_deleted: usize,
}
