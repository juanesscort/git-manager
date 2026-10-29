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

fn normalize_gemini_model(raw_model: &str) -> String {
    let trimmed = raw_model.trim();
    if trimmed.is_empty() {
        return "gemini-3.5-flash-lite".to_string();
    }

    // Convert spaces to hyphens and lowercase
    let lower = trimmed.to_lowercase().replace(' ', "-");

    // Match official high-quota identifiers
    if lower.contains("3.5-flash-lite") || (lower.contains("3.5") && lower.contains("lite")) {
        "gemini-3.5-flash-lite".to_string()
    } else if lower.contains("3.1-flash-lite") || (lower.contains("3.1") && lower.contains("lite"))
    {
        "gemini-3.1-flash-lite".to_string()
    } else if lower.contains("flash-lite-latest") {
        "gemini-flash-lite-latest".to_string()
    } else if lower.contains("3.5-flash") {
        "gemini-3.5-flash".to_string()
    } else if lower.contains("lite") {
        "gemini-3.5-flash-lite".to_string()
    } else if lower.starts_with("gemini-") {
        lower
    } else {
        format!("gemini-{}", lower)
    }
}

impl GeminiProvider {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        let raw = model.unwrap_or_else(|| "gemini-3.5-flash-lite".to_string());
        Self {
            api_key: api_key.trim().to_string(),
            model: normalize_gemini_model(&raw),
        }
    }

    /// 3-Level Cascading Failover Chain
    /// Level 1: Gemini 3.5 Flash Lite (500 RPD, 15 RPM, 250k TPM)
    /// Level 2: Gemini 3.1 Flash Lite (500 RPD, 15 RPM, 250k TPM)
    /// Level 3: Gemini Flash-Lite Latest (Auto-fallback)
    /// Level 4: Gemini 3.5 Flash
    fn get_fallback_chain(&self) -> Vec<String> {
        let default_chain = vec![
            "gemini-3.5-flash-lite".to_string(),
            "gemini-3.1-flash-lite".to_string(),
            "gemini-flash-lite-latest".to_string(),
            "gemini-3.5-flash".to_string(),
        ];

        let mut chain = Vec::new();
        chain.push(self.model.clone());

        for fallback in default_chain {
            if !chain.contains(&fallback) {
                chain.push(fallback);
            }
        }

        chain
    }
}

#[async_trait]
impl AiCommitProvider for GeminiProvider {
    async fn generate_commit(&self, sanitized_diff: &str) -> Result<String, AiServiceError> {
        if self.api_key.starts_with("gen-lang-client") {
            return Err(AiServiceError::ProviderError(
                "La clave ingresada ('gen-lang-client-...') corresponde a un Client ID de Google Cloud OAuth, no a una API Key de Gemini. Por favor obtén tu API Key (comienza con 'AIzaSy...' o 'AQ.Ab...') en Google AI Studio: https://aistudio.google.com/app/apikey".to_string()
            ));
        }

        let client = reqwest::Client::new();
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

        let candidate_models = self.get_fallback_chain();
        let mut last_error_msg = String::new();

        for (idx, current_model) in candidate_models.iter().enumerate() {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                current_model, self.api_key
            );

            let res = client
                .post(&url)
                .header(CONTENT_TYPE, "application/json")
                .header(USER_AGENT, "Git-Manager-Desktop")
                .json(&payload)
                .send()
                .await;

            match res {
                Ok(response) => {
                    let status = response.status();
                    let body_text = response.text().await.unwrap_or_default();

                    if status.is_success() {
                        let candidate_opt = serde_json::from_str::<Value>(&body_text)
                            .ok()
                            .and_then(|b| {
                                b["candidates"][0]["content"]["parts"][0]["text"]
                                    .as_str()
                                    .map(|s| s.to_string())
                            });

                        if let Some(candidate_text) = candidate_opt {
                            let cleaned = candidate_text
                                .trim()
                                .trim_start_matches("```git")
                                .trim_start_matches("```diff")
                                .trim_start_matches("```")
                                .trim_end_matches("```")
                                .trim()
                                .to_string();

                            if !cleaned.is_empty() {
                                return Ok(cleaned);
                            }
                        }
                    }

                    let friendly_msg = if let Ok(parsed) = serde_json::from_str::<Value>(&body_text)
                    {
                        parsed["error"]["message"]
                            .as_str()
                            .unwrap_or(&body_text)
                            .to_string()
                    } else {
                        body_text.clone()
                    };

                    last_error_msg =
                        format!("{} (HTTP {}): {}", current_model, status, friendly_msg);

                    // Check if error is unrecoverable (invalid key)
                    let is_invalid_key = status.as_u16() == 400
                        && (friendly_msg.contains("API key not valid")
                            || friendly_msg.contains("API_KEY_INVALID")
                            || friendly_msg.contains("keyInvalid"));
                    if is_invalid_key {
                        return Err(AiServiceError::ProviderError(
                            "API Key de Gemini no válida. Por favor verifica tu clave en Ajustes de IA.".to_string(),
                        ));
                    }

                    // Check if error is recoverable via failover (429 Rate limit, 404 Model not found, 503 Unavailable)
                    let is_recoverable = status.as_u16() == 429
                        || status.as_u16() == 404
                        || status.as_u16() == 503
                        || friendly_msg.contains("RESOURCE_EXHAUSTED")
                        || friendly_msg.contains("Quota exceeded")
                        || friendly_msg.contains("is not found");

                    if is_recoverable && idx + 1 < candidate_models.len() {
                        eprintln!(
                            "[AI Failover] Modelo '{}' falló ({}), activando respaldo nivel {}: '{}'...",
                            current_model,
                            status,
                            idx + 1,
                            candidate_models[idx + 1]
                        );
                        continue;
                    }
                }
                Err(e) => {
                    last_error_msg = format!("Error de conexión en {}: {}", current_model, e);
                    if idx + 1 < candidate_models.len() {
                        continue;
                    }
                }
            }
        }

        Err(AiServiceError::ProviderError(format!(
            "Gemini no pudo responder en ninguno de los niveles de respaldo. Detalle: {}",
            last_error_msg
        )))
    }
}
