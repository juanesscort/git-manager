use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub provider: String, // "gemini" | "ollama" | "openai"
    pub model: String,
    pub base_url: Option<String>,
    pub has_api_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveAiConfigRequest {
    pub provider: String,
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub base_url: Option<String>,
}
