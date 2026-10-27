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
