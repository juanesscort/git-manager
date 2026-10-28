use thiserror::Error;

#[derive(Error, Debug)]
pub enum GitEngineError {
    #[error("Error de libgit2: {0}")]
    Git(#[from] git2::Error),

    #[error("Repositorio no encontrado en la ruta: {0}")]
    NotFound(String),

    #[error("Repositorio sin commits (HEAD no apunta a un commit válido)")]
    EmptyRepository,

    #[error("Error de entrada/salida (I/O): {0}")]
    Io(#[from] std::io::Error),

    #[error("El índice está bloqueado por otro proceso (.git/index.lock)")]
    IndexLocked,

    #[error("Ruta de archivo inválida: {0}")]
    InvalidPath(String),

    #[error("Repositorio sin árbol de trabajo (bare repository)")]
    BareRepository,

    #[error("Mensaje de commit vacío")]
    EmptyCommitMessage,

    #[error("No se pudo resolver el commit con OID: {0}")]
    CommitNotFound(String),
}
