use super::errors::GitHubError;
use crate::models::github_models::{GitHubUser, RemoteRepo};
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};

pub async fn get_user_profile(token: &str) -> Result<GitHubUser, GitHubError> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://api.github.com/user")
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "GitHub API devolvió código {}",
            res.status()
        )));
    }

    let user: GitHubUser = res.json().await?;
    Ok(user)
}

pub async fn get_user_repositories(token: &str) -> Result<Vec<RemoteRepo>, GitHubError> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://api.github.com/user/repos?affiliation=owner,collaborator&sort=updated&per_page=100")
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "Error al listar repositorios: {}",
            res.status()
        )));
    }

    let repos: Vec<RemoteRepo> = res.json().await?;
    Ok(repos)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreatePullRequestPayload {
    pub title: String,
    pub head: String,
    pub base: String,
    pub body: Option<String>,
    pub draft: Option<bool>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreatedPullRequestResponse {
    pub id: u64,
    pub number: u64,
    pub html_url: String,
    pub state: String,
    pub title: String,
}

pub async fn create_pull_request(
    token: &str,
    owner_repo: &str,
    payload: &CreatePullRequestPayload,
) -> Result<CreatedPullRequestResponse, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!("https://api.github.com/repos/{}/pulls", clean_repo);

    let res = client
        .post(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(payload)
        .send()
        .await?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "GitHub devolvió error al crear el Pull Request: {}",
            err_body
        )));
    }

    let pr: CreatedPullRequestResponse = res.json().await?;
    Ok(pr)
}
