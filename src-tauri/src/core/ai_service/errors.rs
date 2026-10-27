use thiserror::Error;

#[derive(Error, Debug)]
pub enum AiServiceError {
    #[error("No hay cambios preparados (staged) para generar commit")]
    NoStagedChanges,

    #[error("Error de red HTTP: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Error al acceder a Keyring: {0}")]
    Keyring(String),

    #[error("API Key no configurada para el proveedor: {0}")]
    MissingApiKey(String),

    #[error("Error al comunicarse con la IA: {0}")]
    ProviderError(String),

    #[error("Error de serialización JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Error de Git: {0}")]
    Git(#[from] crate::core::git_engine::GitEngineError),
}
