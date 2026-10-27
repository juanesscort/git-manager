use super::errors::AiServiceError;
use super::gemini::GeminiProvider;
use super::ollama::OllamaProvider;
use super::openai::OpenAiProvider;
use super::traits::AiCommitProvider;
use crate::models::ai_models::AiConfig;
use keyring::Entry;
use std::sync::Mutex;

const KEYRING_SERVICE: &str = "git-manager";
const KEYRING_AI_KEY: &str = "ai_api_key";

static GLOBAL_AI_CONFIG: Mutex<Option<AiConfig>> = Mutex::new(None);

pub fn save_ai_settings(
    provider: String,
    api_key: Option<String>,
    model: Option<String>,
    base_url: Option<String>,
) -> Result<(), AiServiceError> {
    if let Some(key) = api_key.filter(|k| !k.trim().is_empty()) {
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_AI_KEY)
            .map_err(|e| AiServiceError::Keyring(e.to_string()))?;
        entry
            .set_password(&key)
            .map_err(|e| AiServiceError::Keyring(e.to_string()))?;
    }

    let default_model = match provider.as_str() {
        "gemini" => "gemini-2.5-flash".to_string(),
        "ollama" => "qwen2.5-coder".to_string(),
        _ => "gpt-4o-mini".to_string(),
    };

    let cfg = AiConfig {
        provider,
        model: model.unwrap_or(default_model),
        base_url,
        has_api_key: get_ai_api_key().is_ok_and(|k| k.is_some()),
    };

    let mut lock = GLOBAL_AI_CONFIG
        .lock()
        .map_err(|_| AiServiceError::ProviderError("Error de bloqueo mutex".to_string()))?;
    *lock = Some(cfg);

    Ok(())
}

pub fn get_ai_settings() -> AiConfig {
    let lock = GLOBAL_AI_CONFIG.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(ref cfg) = *lock {
        let mut cloned = cfg.clone();
        cloned.has_api_key = get_ai_api_key().is_ok_and(|k| k.is_some());
        cloned
    } else {
        AiConfig {
            provider: "gemini".to_string(),
            model: "gemini-2.5-flash".to_string(),
            base_url: None,
            has_api_key: get_ai_api_key().is_ok_and(|k| k.is_some()),
        }
    }
}

pub fn get_ai_api_key() -> Result<Option<String>, AiServiceError> {
    // Check environment variable GEMINI_API_KEY as convenient fallback
    if let Ok(key) = std::env::var("GEMINI_API_KEY") {
        let trimmed = key.trim();
        if !trimmed.is_empty() {
            return Ok(Some(trimmed.to_string()));
        }
    }

    let entry = Entry::new(KEYRING_SERVICE, KEYRING_AI_KEY)
        .map_err(|e| AiServiceError::Keyring(e.to_string()))?;
    match entry.get_password() {
        Ok(pwd) => Ok(Some(pwd)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AiServiceError::Keyring(e.to_string())),
    }
}

pub fn create_active_provider() -> Result<Box<dyn AiCommitProvider>, AiServiceError> {
    let cfg = get_ai_settings();

    match cfg.provider.as_str() {
        "ollama" => Ok(Box::new(OllamaProvider::new(cfg.base_url, Some(cfg.model)))),
        "openai" => {
            let api_key = get_ai_api_key()?
                .ok_or_else(|| AiServiceError::MissingApiKey("OpenAI".to_string()))?;
            Ok(Box::new(OpenAiProvider::new(
                api_key,
                cfg.base_url,
                Some(cfg.model),
            )))
        }
        _ => {
            // Default Gemini
            let api_key = get_ai_api_key()?
                .ok_or_else(|| AiServiceError::MissingApiKey("Gemini".to_string()))?;
            Ok(Box::new(GeminiProvider::new(api_key, Some(cfg.model))))
        }
    }
}
