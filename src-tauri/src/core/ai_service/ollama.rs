use super::errors::AiServiceError;
use super::prompts::templates::commit::{COMMIT_SYSTEM_PROMPT as SYSTEM_PROMPT, build_commit_user_prompt as build_user_prompt};
use super::traits::AiCommitProvider;
use async_trait::async_trait;
use reqwest::header::{CONTENT_TYPE, USER_AGENT};
use serde_json::{Value, json};

pub struct OllamaProvider {
    pub base_url: String,
    pub model: String,
}

impl OllamaProvider {
    pub fn new(base_url: Option<String>, model: Option<String>) -> Self {
        Self {
            base_url: base_url.unwrap_or_else(|| "http://localhost:11434".to_string()),
            model: model.unwrap_or_else(|| "qwen2.5-coder".to_string()),
        }
    }
}

#[async_trait]
impl AiCommitProvider for OllamaProvider {
    async fn generate_commit(&self, sanitized_diff: &str) -> Result<String, AiServiceError> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/generate", self.base_url.trim_end_matches('/'));

        let user_prompt = build_user_prompt(sanitized_diff);

        let payload = json!({
            "model": self.model,
            "system": SYSTEM_PROMPT,
            "prompt": user_prompt,
            "stream": false,
            "options": {
                "temperature": 0.2
            }
        });

        let res = client
            .post(&url)
            .header(CONTENT_TYPE, "application/json")
            .header(USER_AGENT, "Git-Manager-Desktop")
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                AiServiceError::ProviderError(format!(
                    "No se pudo conectar a Ollama en {}. ¿Está el servicio corriendo? Detalle: {}",
                    self.base_url, e
                ))
            })?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AiServiceError::ProviderError(format!(
                "Ollama devolvió código {}: {}",
                status, body
            )));
        }

        let body: Value = res.json().await?;
        let raw_response = body["response"].as_str().ok_or_else(|| {
            AiServiceError::ProviderError("Respuesta de Ollama vacía".to_string())
        })?;

        let cleaned = raw_response
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
