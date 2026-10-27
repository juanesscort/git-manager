//! Estructuras de datos (DTOs) compartidas para serialización/deserialización IPC.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStatus {
    pub ready: bool,
    pub version: String,
    pub message: String,
}
