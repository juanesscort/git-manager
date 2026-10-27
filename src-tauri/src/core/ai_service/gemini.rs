use super::errors::AiServiceError;
use super::prompt::{SYSTEM_PROMPT, build_user_prompt};
use super::traits::AiCommitProvider;
use async_trait::async_trait;
use reqwest::header::{CONTENT_TYPE, USER_AGENT};
use serde_json::{Value, json};

pub struct GeminiProvider {
    pub api_key: String,
    pub model: String,
}

impl GeminiProvider {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            api_key,
            model: model.unwrap_or_else(|| "gemini-2.5-flash".to_string()),
        }
    }
}

#[async_trait]
impl AiCommitProvider for GeminiProvider {
    async fn generate_commit(&self, sanitized_diff: &str) -> Result<String, AiServiceError> {
        let client = reqwest::Client::new();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let user_prompt = build_user_prompt(sanitized_diff);

        let payload = json!({
            "systemInstruction": {
                "parts": [{ "text": SYSTEM_PROMPT }]
            },
            "contents": [{
                "parts": [{ "text": user_prompt }]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 300
            }
        });

        let res = client
            .post(&url)
            .header(CONTENT_TYPE, "application/json")
            .header(USER_AGENT, "Git-Manager-Desktop")
            .json(&payload)
            .send()
            .await?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(AiServiceError::ProviderError(format!(
                "Gemini API devolvió error {}: {}",
                status, body
            )));
        }

        let body: Value = res.json().await?;

        let candidate_text = body["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| {
                AiServiceError::ProviderError("Respuesta de Gemini vacía o malformada".to_string())
            })?;

        // Clean any code block backticks if present
        let cleaned = candidate_text
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
