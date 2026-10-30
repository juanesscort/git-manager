use super::errors::AiServiceError;
use super::prompts::templates::commit::{COMMIT_SYSTEM_PROMPT as SYSTEM_PROMPT, build_commit_user_prompt as build_user_prompt};
use super::traits::AiCommitProvider;
use async_trait::async_trait;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde_json::{Value, json};

pub struct OpenAiProvider {
    pub api_key: String,
    pub base_url: String,
    pub model: String,
}

impl OpenAiProvider {
    pub fn new(api_key: String, base_url: Option<String>, model: Option<String>) -> Self {
        Self {
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
            model: model.unwrap_or_else(|| "gpt-4o-mini".to_string()),
        }
    }
}

#[async_trait]
impl AiCommitProvider for OpenAiProvider {
    async fn generate_commit(&self, sanitized_diff: &str) -> Result<String, AiServiceError> {
        let client = reqwest::Client::new();
        let url = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));

        let user_prompt = build_user_prompt(sanitized_diff);

        let payload = json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": SYSTEM_PROMPT },
                { "role": "user", "content": user_prompt }
            ],
            "temperature": 0.2,
            "max_tokens": 300
        });

        let res = client
            .post(&url)
            .header(CONTENT_TYPE, "application/json")
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(USER_AGENT, "Git-Manager-Desktop")
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AiServiceError::ProviderError(format!(
                "API devolvió error {}: {}",
                status, body
            )));
        }

        let body: Value = res.json().await?;
        let message = body["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| AiServiceError::ProviderError("Respuesta de API vacía".to_string()))?;

        let cleaned = message
            .trim()
            .trim_start_matches("```git")
            .trim_start_matches("```diff")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
            .to_string();

        Ok(cleaned)
    }
}
