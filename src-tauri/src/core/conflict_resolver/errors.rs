use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConflictError {
    #[error("Error de libgit2: {0}")]
    Git(#[from] git2::Error),

    #[error("Error de entrada/salida (I/O): {0}")]
    Io(#[from] std::io::Error),

    #[error("El archivo '{0}' no tiene estado de conflicto en el repositorio")]
    NotConflicted(String),

    #[error("No se pudo leer el contenido de la etapa {0} (stage)")]
    BlobNotFound(i32),

    #[error("Repositorio sin directorio de trabajo (bare)")]
    BareRepository,
}
