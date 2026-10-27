---
name: git2-engine-recipes
description: Recipes, patterns, and procedures for implementing Git operations using git2-rs (libgit2). Use when developing repository inspection, staging/unstaging, diff calculation, commit graph traversal, and 3-way conflict resolution.
---

# Git2-rs Engine Recipes & Patterns

This skill serves as a reference manual for safe, idiomatic, and high-performance Git operations in Rust using `git2-rs` (`libgit2`).

---

## 1. Opening and Status Inspection

### Opening a Repository
```rust
use git2::Repository;
use std::path::Path;

pub fn open_repository<P: AsRef<Path>>(path: P) -> Result<Repository, git2::Error> {
    Repository::discover(path)
}
```

### Inspecting Statuses (Staged vs. Unstaged)
```rust
use git2::{Status, StatusOptions};

pub fn get_file_statuses(repo: &git2::Repository) -> Result<Vec<(String, Status)>, git2::Error> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts))?;
    let mut results = Vec::new();

    for entry in statuses.iter() {
        if let Some(path) = entry.path() {
            results.push((path.to_string(), entry.status()));
        }
    }
    Ok(results)
}
```

---

## 2. Staging and Unstaging Files

### Adding a File to Index (Staging)
```rust
pub fn stage_file(repo: &git2::Repository, relative_path: &str) -> Result<(), git2::Error> {
    let mut index = repo.index()?;
    index.add_path(std::path::Path::new(relative_path))?;
    index.write()?;
    Ok(())
}
```

### Unstaging a File (Reset to HEAD)
```rust
pub fn unstage_file(repo: &git2::Repository, relative_path: &str) -> Result<(), git2::Error> {
    let head = repo.head()?.peel_to_commit()?;
    let head_tree = head.tree()?;
    let path = std::path::Path::new(relative_path);
    
    repo.reset_default(Some(&head_tree.as_object()), [path])?;
    Ok(())
}
```

---

## 3. Calculating Diffs

### Getting Staged Diff (Ready for Commit / AI)
```rust
pub fn get_staged_diff(repo: &git2::Repository) -> Result<String, git2::Error> {
    let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let mut diff_opts = git2::DiffOptions::new();
    let diff = repo.diff_tree_to_index(head.as_ref(), None, Some(&mut diff_opts))?;
    
    let mut output = Vec::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        output.extend_from_slice(line.content());
        true
    })?;
    
    Ok(String::from_utf8_lossy(&output).to_string())
}
```

---

## 4. Traversing the Commit Graph (Revwalk)

```rust
pub fn fetch_commit_history(repo: &git2::Repository, max_count: usize) -> Result<Vec<git2::Oid>, git2::Error> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::TIME)?;
    
    let oids: Vec<git2::Oid> = revwalk
        .take(max_count)
        .filter_map(Result::ok)
        .collect();
        
    Ok(oids)
}
```

---

## 5. 3-Way Conflict Detection and Resolution

### Checking for Conflicts in Index
```rust
pub fn has_conflicts(repo: &git2::Repository) -> Result<bool, git2::Error> {
    let index = repo.index()?;
    Ok(index.has_conflicts())
}
```

### Resolving a Conflicted Entry
Once the resolved content is determined:
```rust
pub fn mark_conflict_resolved(
    repo: &git2::Repository, 
    path: &std::path::Path, 
    resolved_bytes: &[u8]
) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Write resolved content to the working directory file
    let full_path = repo.workdir().ok_or("Bare repository")?.join(path);
    std::fs::write(&full_path, resolved_bytes)?;

    // 2. Add to index to clear the conflict state
    let mut index = repo.index()?;
    index.add_path(path)?;
    index.write()?;
    Ok(())
}
```
