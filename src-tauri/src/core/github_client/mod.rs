//! Cliente de integración con la API de GitHub y autenticación segura con Keyring.

pub mod api;
pub mod auth;
pub mod errors;

pub use api::{
    CreatePullRequestPayload, CreatedPullRequestResponse, cancel_workflow_run, create_pull_request,
    dispatch_workflow, get_pull_request_checks, get_pull_request_details,
    get_repository_permissions, get_user_profile, get_user_repositories, get_workflow_job_logs,
    list_repository_pulls, list_repository_workflows, list_workflow_run_jobs, list_workflow_runs,
    merge_pull_request, rerun_workflow_run, submit_pull_request_review,
};
pub use auth::{
    GITHUB_CLIENT_ID, delete_saved_token, get_saved_token, poll_access_token, request_device_code,
    save_token,
};
pub use errors::GitHubError;
