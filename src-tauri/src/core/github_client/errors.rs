use thiserror::Error;

#[derive(Error, Debug)]
pub enum GitHubError {
    #[error("Error de red HTTP: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Error al acceder al almacén de claves (Keyring): {0}")]
    Keyring(String),

    #[error("No hay sesión activa de GitHub")]
    NotAuthenticated,

    #[error("Autorización pendiente por parte del usuario")]
    AuthPending,

    #[error("El código de autorización ha expirado")]
    AuthExpired,

    #[error("Demasiadas solicitudes rápidas (Slow down)")]
    SlowDown,

    #[error("Error de autenticación en GitHub: {0}")]
    AuthFailed(String),

    #[error("Error de serialización JSON: {0}")]
    Json(#[from] serde_json::Error),
}
