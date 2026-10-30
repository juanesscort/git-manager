use crate::core::ai_service::config::create_active_provider;
use crate::core::ai_service::sanitizer::sanitize_git_diff;
use crate::core::ai_service::{
    AiPromptRegistry, AiTaskKind, PromptContext, generate_commit_for_staged, get_ai_settings,
    save_ai_settings,
};
use crate::core::git_engine::{check_branch_diff, get_branch_diff_full, open_repository};
use crate::models::ai_models::{AiConfig, SaveAiConfigRequest};
use crate::models::git_models::BranchDiffCheckResult;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PullRequestAiDto {
    pub title: String,
    pub description: String,
}

#[tauri::command]
pub async fn check_branch_diff_cmd(
    repo_path: String,
    base: String,
    head: String,
) -> Result<BranchDiffCheckResult, String> {
    let repo = open_repository(&repo_path).map_err(|e| e.to_string())?;
    check_branch_diff(&repo, &base, &head).map_err(|e| e.to_string())
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

    // 1. Verify that there are actually commits and changes between the branches
    let diff_check = check_branch_diff(&repo, &base, &head).map_err(|e| e.to_string())?;
    if !diff_check.has_changes {
        return Err(format!(
            "No se detectaron diferencias ni commits por fusionar desde '{}' hacia '{}'. La rama destino ya está al día.",
            head, base
        ));
    }

    let raw_diff = get_branch_diff_full(&repo, &base, &head).map_err(|e| e.to_string())?;
    let sanitized_diff = sanitize_git_diff(&raw_diff);

    let provider = create_active_provider().map_err(|e| e.to_string())?;
    let context =
        PromptContext::for_pull_request(&sanitized_diff, &head, &base, &diff_check.commits_summary);
    let prompt = AiPromptRegistry::user_prompt(AiTaskKind::PullRequest, &context);

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
