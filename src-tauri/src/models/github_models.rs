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
    pub name: Option<String>,
    pub avatar_url: String,
    pub html_url: String,
    pub public_repos: u64,
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
    pub description: Option<String>,
    pub updated_at: String,
}
