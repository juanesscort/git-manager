use crate::core::github_client::{
    CreatePullRequestPayload, CreatedPullRequestResponse, GITHUB_CLIENT_ID, create_pull_request,
    delete_saved_token, get_pull_request_checks, get_pull_request_details,
    get_repository_permissions, get_saved_token, get_user_profile, get_user_repositories,
    list_repository_pulls, merge_pull_request, poll_access_token, request_device_code,
    submit_pull_request_review,
};
use crate::models::github_models::{
    CheckRunItem, DeviceAuthResponse, GitHubUser, MergePullRequestPayload, PullRequestDetail,
    PullRequestItem, RemoteRepo, RepoPermissions, SubmitReviewPayload,
};

#[tauri::command]
pub async fn start_github_device_flow() -> Result<DeviceAuthResponse, String> {
    request_device_code(GITHUB_CLIENT_ID)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn poll_github_device_token(device_code: String) -> Result<Option<GitHubUser>, String> {
    let token_opt = poll_access_token(GITHUB_CLIENT_ID, &device_code)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(token) = token_opt {
        let user = get_user_profile(&token).await.map_err(|e| e.to_string())?;
        Ok(Some(user))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn check_github_session() -> Result<Option<GitHubUser>, String> {
    let token_opt = get_saved_token().map_err(|e| e.to_string())?;

    if let Some(token) = token_opt {
        match get_user_profile(&token).await {
            Ok(user) => Ok(Some(user)),
            Err(_) => {
                // If token is invalid or revoked, clean up
                let _ = delete_saved_token();
                Ok(None)
            }
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn save_github_token_cmd(token: String) -> Result<GitHubUser, String> {
    let clean_token = token.trim();
    if clean_token.is_empty() {
        return Err("El token no puede estar vacío".to_string());
    }
    let user = get_user_profile(clean_token)
        .await
        .map_err(|e| e.to_string())?;
    crate::core::github_client::save_token(clean_token).map_err(|e| e.to_string())?;
    Ok(user)
}

#[tauri::command]
pub async fn logout_github_session() -> Result<(), String> {
    delete_saved_token().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_github_repositories() -> Result<Vec<RemoteRepo>, String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    get_user_repositories(&token)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_pull_request_cmd(
    owner_repo: String,
    title: String,
    head: String,
    base: String,
    body: Option<String>,
    draft: Option<bool>,
) -> Result<CreatedPullRequestResponse, String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| {
            "No has iniciado sesión en GitHub. Conéctate primero en la aplicación.".to_string()
        })?;

    let payload = CreatePullRequestPayload {
        title,
        head,
        base,
        body,
        draft,
    };

    create_pull_request(&token, &owner_repo, &payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_repo_permissions_cmd(owner_repo: String) -> Result<RepoPermissions, String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    get_repository_permissions(&token, &owner_repo)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_pull_requests_cmd(
    owner_repo: String,
    state: Option<String>,
) -> Result<Vec<PullRequestItem>, String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    list_repository_pulls(&token, &owner_repo, state.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pull_request_details_cmd(
    owner_repo: String,
    pull_number: u64,
) -> Result<PullRequestDetail, String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    get_pull_request_details(&token, &owner_repo, pull_number)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pull_request_checks_cmd(
    owner_repo: String,
    head_sha: String,
) -> Result<Vec<CheckRunItem>, String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    get_pull_request_checks(&token, &owner_repo, &head_sha)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn submit_pull_request_review_cmd(
    owner_repo: String,
    pull_number: u64,
    event: String,
    body: Option<String>,
) -> Result<(), String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    let payload = SubmitReviewPayload { event, body };
    submit_pull_request_review(&token, &owner_repo, pull_number, &payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn merge_pull_request_cmd(
    owner_repo: String,
    pull_number: u64,
    merge_method: String,
    commit_title: Option<String>,
    commit_message: Option<String>,
) -> Result<(), String> {
    let token = get_saved_token()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No has iniciado sesión en GitHub".to_string())?;

    let payload = MergePullRequestPayload {
        commit_title,
        commit_message,
        merge_method,
    };

    merge_pull_request(&token, &owner_repo, pull_number, &payload)
        .await
        .map_err(|e| e.to_string())
}
