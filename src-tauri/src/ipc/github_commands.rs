use crate::core::github_client::{
    GITHUB_CLIENT_ID, delete_saved_token, get_saved_token, get_user_profile, get_user_repositories,
    poll_access_token, request_device_code,
};
use crate::models::github_models::{DeviceAuthResponse, GitHubUser, RemoteRepo};

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
