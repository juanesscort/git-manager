use super::errors::ConflictError;
use git2::Repository;
use std::collections::BTreeSet;

pub fn has_conflicts(repo: &Repository) -> bool {
    repo.index().map(|idx| idx.has_conflicts()).unwrap_or(false)
}

pub fn list_conflicted_files(repo: &Repository) -> Result<Vec<String>, ConflictError> {
    let index = repo.index()?;
    if !index.has_conflicts() {
        return Ok(Vec::new());
    }

    let mut set = BTreeSet::new();
    let conflicts = index.conflicts()?;

    for conflict_result in conflicts {
        let conflict = conflict_result?;

        if let Some(p) = conflict
            .ancestor
            .as_ref()
            .and_then(|a| std::str::from_utf8(&a.path).ok())
        {
            set.insert(p.to_string());
        }

        if let Some(p) = conflict
            .our
            .as_ref()
            .and_then(|o| std::str::from_utf8(&o.path).ok())
        {
            set.insert(p.to_string());
        }

        if let Some(p) = conflict
            .their
            .as_ref()
            .and_then(|t| std::str::from_utf8(&t.path).ok())
        {
            set.insert(p.to_string());
        }
    }

    Ok(set.into_iter().collect())
}
