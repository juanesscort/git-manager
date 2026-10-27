//! Estructuras de datos (DTOs) compartidas para serialización/deserialización IPC.

pub mod ai_models;
pub mod conflict_models;
pub mod git_models;
pub mod github_models;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStatus {
    pub ready: bool,
    pub version: String,
    pub message: String,
}
