//! Cliente de integración con la API de GitHub y autenticación segura con Keyring.

pub mod api;
pub mod auth;
pub mod errors;

pub use api::{
    CreatePullRequestPayload, CreatedPullRequestResponse, create_pull_request,
    get_pull_request_checks, get_pull_request_details, get_repository_permissions,
    get_user_profile, get_user_repositories, list_repository_pulls, merge_pull_request,
    submit_pull_request_review,
};
pub use auth::{
    GITHUB_CLIENT_ID, delete_saved_token, get_saved_token, poll_access_token, request_device_code,
    save_token,
};
pub use errors::GitHubError;
