use crate::core::ai_service::{generate_commit_for_staged, get_ai_settings, save_ai_settings};
use crate::models::ai_models::{AiConfig, SaveAiConfigRequest};

#[tauri::command]
pub async fn generate_ai_commit(repo_path: String) -> Result<String, String> {
    generate_commit_for_staged(&repo_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_ai_config(config: SaveAiConfigRequest) -> Result<(), String> {
    save_ai_settings(
        config.provider,
        config.api_key,
        config.model,
        config.base_url,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_ai_config() -> Result<AiConfig, String> {
    Ok(get_ai_settings())
}
