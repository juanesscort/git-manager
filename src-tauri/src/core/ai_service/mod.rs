//! Servicio de análisis de diffs y generación de commits con IA.

pub mod config;
pub mod errors;
pub mod gemini;
pub mod generator;
pub mod ollama;
pub mod openai;
pub mod prompt;
pub mod sanitizer;
pub mod traits;

#[cfg(test)]
mod tests;

pub use config::{get_ai_settings, save_ai_settings};
pub use errors::AiServiceError;
pub use generator::generate_commit_for_staged;
pub use traits::AiCommitProvider;
