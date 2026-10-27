//! Estructuras de datos (DTOs) compartidas para serialización/deserialización IPC.

pub mod git_models;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStatus {
    pub ready: bool,
    pub version: String,
    pub message: String,
}
