//! Cliente de integración con la API de GitHub y autenticación segura con Keyring.

pub mod api;
pub mod auth;
pub mod errors;

pub use api::{get_user_profile, get_user_repositories};
pub use auth::{
    GITHUB_CLIENT_ID, delete_saved_token, get_saved_token, poll_access_token, request_device_code,
    save_token,
};
pub use errors::GitHubError;
