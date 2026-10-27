use super::errors::ConflictError;
use git2::Repository;
use std::fs;
use std::path::Path;

pub fn resolve_conflicted_file(
    repo: &Repository,
    relative_path: &str,
    resolved_content: &str,
) -> Result<(), ConflictError> {
    let workdir = repo.workdir().ok_or(ConflictError::BareRepository)?;
    let p = Path::new(relative_path);
    let full_path = workdir.join(p);

    // 1. Write the user-resolved content to the disk
    fs::write(&full_path, resolved_content)?;

    // 2. Add to index to resolve conflict (collapses stages 1,2,3 into stage 0)
    let mut index = repo.index()?;
    index.add_path(p)?;
    index.write()?;

    Ok(())
}
