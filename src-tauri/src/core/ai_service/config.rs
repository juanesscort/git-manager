use super::errors::AiServiceError;
use super::gemini::GeminiProvider;
use super::ollama::OllamaProvider;
use super::openai::OpenAiProvider;
use super::traits::AiCommitProvider;
use crate::models::ai_models::AiConfig;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

const KEYRING_SERVICE: &str = "git-manager";
const KEYRING_AI_KEY: &str = "ai_api_key";
pub const DEFAULT_GEMINI_MODEL: &str = "gemini-3.5-flash-lite";

static GLOBAL_AI_CONFIG: Mutex<Option<AiConfig>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredAiSettings {
    pub provider: String,
    pub model: String,
    pub base_url: Option<String>,
}

fn get_config_file_path() -> Option<PathBuf> {
    let base = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|_| std::env::var("HOME").map(|h| PathBuf::from(h).join(".config")))
        .ok()?;
    Some(base.join("git-manager").join("ai_config.json"))
}

fn load_stored_settings() -> Option<StoredAiSettings> {
    let path = get_config_file_path()?;
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn persist_stored_settings(settings: &StoredAiSettings) {
    if let Some(path) = get_config_file_path() {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(settings) {
            let _ = std::fs::write(path, json);
        }
    }
}

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
        "gemini" => DEFAULT_GEMINI_MODEL.to_string(),
        "ollama" => "qwen2.5-coder".to_string(),
        _ => "gpt-4o-mini".to_string(),
    };

    let chosen_model = model
        .filter(|m| !m.trim().is_empty())
        .unwrap_or(default_model);

    // Persist model & provider to disk so settings survive app restarts
    let stored = StoredAiSettings {
        provider: provider.clone(),
        model: chosen_model.clone(),
        base_url: base_url.clone(),
    };
    persist_stored_settings(&stored);

    let cfg = AiConfig {
        provider,
        model: chosen_model,
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
    let mut lock = GLOBAL_AI_CONFIG.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(ref cfg) = *lock {
        let mut cloned = cfg.clone();
        cloned.has_api_key = get_ai_api_key().is_ok_and(|k| k.is_some());
        cloned
    } else {
        // Try loading from persistent disk storage
        let (provider, model, base_url) = if let Some(stored) = load_stored_settings() {
            (stored.provider, stored.model, stored.base_url)
        } else {
            ("gemini".to_string(), DEFAULT_GEMINI_MODEL.to_string(), None)
        };

        let cfg = AiConfig {
            provider,
            model,
            base_url,
            has_api_key: get_ai_api_key().is_ok_and(|k| k.is_some()),
        };
        *lock = Some(cfg.clone());
        cfg
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
            // Default Gemini with automatic 3-level cascading failover
            let api_key = get_ai_api_key()?
                .ok_or_else(|| AiServiceError::MissingApiKey("Gemini".to_string()))?;
            Ok(Box::new(GeminiProvider::new(api_key, Some(cfg.model))))
        }
    }
}
