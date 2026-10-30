use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceAuthResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubUser {
    pub login: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub avatar_url: String,
    #[serde(default)]
    pub html_url: String,
    #[serde(default)]
    pub public_repos: u64,
    #[serde(default)]
    pub total_private_repos: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteRepo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub private: bool,
    pub html_url: String,
    pub clone_url: String,
    pub ssh_url: String,
    pub default_branch: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoPermissions {
    #[serde(default)]
    pub admin: bool,
    #[serde(default)]
    pub maintain: bool,
    #[serde(default)]
    pub push: bool,
    #[serde(default)]
    pub triage: bool,
    #[serde(default)]
    pub pull: bool,
    #[serde(default)]
    pub role_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestBranchRef {
    pub ref_name: String,
    pub sha: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestItem {
    pub id: u64,
    pub number: u64,
    pub state: String,
    pub title: String,
    pub user: GitHubUser,
    #[serde(default)]
    pub body: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub html_url: String,
    #[serde(default)]
    pub draft: bool,
    pub head_ref: String,
    pub head_sha: String,
    pub base_ref: String,
    pub base_sha: String,
    #[serde(default)]
    pub comments_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestDetail {
    pub id: u64,
    pub number: u64,
    pub state: String,
    pub title: String,
    pub user: GitHubUser,
    #[serde(default)]
    pub body: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub html_url: String,
    #[serde(default)]
    pub draft: bool,
    pub head_ref: String,
    pub head_sha: String,
    pub base_ref: String,
    pub base_sha: String,
    #[serde(default)]
    pub additions: u64,
    #[serde(default)]
    pub deletions: u64,
    #[serde(default)]
    pub changed_files: u64,
    #[serde(default)]
    pub mergeable: Option<bool>,
    #[serde(default)]
    pub mergeable_state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckRunItem {
    pub id: u64,
    pub name: String,
    pub status: String,
    #[serde(default)]
    pub conclusion: Option<String>,
    #[serde(default)]
    pub html_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestReview {
    pub id: u64,
    pub user: GitHubUser,
    pub state: String,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub submitted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitReviewPayload {
    pub event: String,
    #[serde(default)]
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergePullRequestPayload {
    #[serde(default)]
    pub commit_title: Option<String>,
    #[serde(default)]
    pub commit_message: Option<String>,
    pub merge_method: String,
}
