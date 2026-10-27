use super::errors::GitHubError;
use crate::models::github_models::DeviceAuthResponse;
use keyring::Entry;
use reqwest::header::{ACCEPT, USER_AGENT};
use serde::Deserialize;

pub const GITHUB_CLIENT_ID: &str = "Ov23liDtG8r2vmM9qFdG";
const KEYRING_SERVICE: &str = "git-manager";
const KEYRING_USER: &str = "github_token";

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct TokenResponse {
    #[serde(default)]
    access_token: Option<String>,
    #[serde(default)]
    token_type: Option<String>,
    #[serde(default)]
    scope: Option<String>,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    error_description: Option<String>,
    #[serde(default)]
    interval: Option<u64>,
}

pub async fn request_device_code(client_id: &str) -> Result<DeviceAuthResponse, GitHubError> {
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "client_id": client_id,
        "scope": "repo,read:user"
    });

    let res = client
        .post("https://github.com/login/device/code")
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "Git-Manager-Desktop")
        .json(&payload)
        .send()
        .await?;

    let auth_res: DeviceAuthResponse = res.json().await?;
    Ok(auth_res)
}

pub async fn poll_access_token(
    client_id: &str,
    device_code: &str,
) -> Result<Option<String>, GitHubError> {
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "client_id": client_id,
        "device_code": device_code,
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
    });

    let res = client
        .post("https://github.com/login/oauth/access_token")
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "Git-Manager-Desktop")
        .json(&payload)
        .send()
        .await?;

    let text = res.text().await?;
    println!("[GitHub Auth] Poll response: {}", text);

    let token_res: TokenResponse = serde_json::from_str(&text)?;

    if let Some(token) = token_res.access_token.filter(|t| !t.is_empty()) {
        save_token(&token)?;
        return Ok(Some(token));
    }

    if let Some(err) = token_res.error {
        match err.as_str() {
            "authorization_pending" => Ok(None),
            "slow_down" => Ok(None),
            "expired_token" => Err(GitHubError::AuthExpired),
            "access_denied" => Err(GitHubError::AuthFailed(
                "Acceso denegado en GitHub".to_string(),
            )),
            _ => Err(GitHubError::AuthFailed(format!(
                "{}: {}",
                err,
                token_res.error_description.unwrap_or_default()
            ))),
        }
    } else {
        Ok(None)
    }
}

pub fn save_token(token: &str) -> Result<(), GitHubError> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| GitHubError::Keyring(e.to_string()))?;
    entry
        .set_password(token)
        .map_err(|e| GitHubError::Keyring(e.to_string()))
}

pub fn get_saved_token() -> Result<Option<String>, GitHubError> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| GitHubError::Keyring(e.to_string()))?;
    match entry.get_password() {
        Ok(pwd) => Ok(Some(pwd)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(GitHubError::Keyring(e.to_string())),
    }
}

pub fn delete_saved_token() -> Result<(), GitHubError> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| GitHubError::Keyring(e.to_string()))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(GitHubError::Keyring(e.to_string())),
    }
}
