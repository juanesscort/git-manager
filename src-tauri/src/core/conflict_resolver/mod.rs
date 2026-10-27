//! Motor de detección y resolución visual de conflictos de 3 vías (3-way merge).

pub mod detector;
pub mod errors;
pub mod extractor;
pub mod resolver;

#[cfg(test)]
mod tests;

pub use detector::{has_conflicts, list_conflicted_files};
pub use errors::ConflictError;
pub use extractor::extract_conflict_details;
pub use resolver::resolve_conflicted_file;
