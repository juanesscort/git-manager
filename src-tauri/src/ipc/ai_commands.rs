use crate::core::ai_service::config::create_active_provider;
use crate::core::ai_service::sanitizer::sanitize_git_diff;
use crate::core::ai_service::{generate_commit_for_staged, get_ai_settings, save_ai_settings};
use crate::core::git_engine::{get_branch_diff_full, open_repository};
use crate::models::ai_models::{AiConfig, SaveAiConfigRequest};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PullRequestAiDto {
    pub title: String,
    pub description: String,
}

#[tauri::command]
pub async fn generate_ai_commit(repo_path: String) -> Result<String, String> {
    generate_commit_for_staged(&repo_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_ai_pull_request(
    repo_path: String,
    base: String,
    head: String,
) -> Result<PullRequestAiDto, String> {
    let repo = open_repository(&repo_path).map_err(|e| e.to_string())?;
    let raw_diff = get_branch_diff_full(&repo, &base, &head).map_err(|e| e.to_string())?;

    let sanitized_diff = if raw_diff.trim().is_empty() {
        format!("Cambios entre rama '{}' y rama '{}'.", base, head)
    } else {
        sanitize_git_diff(&raw_diff)
    };

    let provider = create_active_provider().map_err(|e| e.to_string())?;
    let prompt = format!(
        "Genera un Pull Request para fusionar '{}' en '{}'.\n\nFORMATO OBLIGATORIO:\nTITLE: <título conciso en español>\nDESCRIPTION:\n## 📌 Resumen de Cambios\n<descripción concisa en español>\n\n## 🚀 Novedades y Mejoras\n- <viñeta>\n- <viñeta>\n\nDiff de cambios:\n```diff\n{}\n```",
        head, base, sanitized_diff
    );

    let response = provider
        .generate_commit(&prompt)
        .await
        .map_err(|e| e.to_string())?;

    let mut title = format!("feat: fusionar {} en {}", head, base);
    let mut description = String::new();

    if let Some((t, d)) = response.split_once("DESCRIPTION:") {
        let clean_t = t.replace("TITLE:", "").trim().to_string();
        if !clean_t.is_empty() {
            title = clean_t;
        }
        description = d.trim().to_string();
    } else if let Some(first_line) = response.lines().next() {
        title = first_line.trim().to_string();
        description = response
            .lines()
            .skip(1)
            .collect::<Vec<_>>()
            .join("\n")
            .trim()
            .to_string();
    }

    Ok(PullRequestAiDto { title, description })
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
