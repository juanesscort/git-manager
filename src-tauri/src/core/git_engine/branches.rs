use crate::core::git_engine::errors::GitEngineError;
use crate::models::git_models::{BranchInfo, BranchesSummary};
use git2::{BranchType, Repository};

pub fn get_branches(repo: &Repository) -> Result<BranchesSummary, GitEngineError> {
    let mut local_branches = Vec::new();
    let mut remote_branches = Vec::new();

    // 1. Local Branches
    if let Ok(branches) = repo.branches(Some(BranchType::Local)) {
        for branch_res in branches {
            let (branch, _) = branch_res?;
            let name = branch.name()?.unwrap_or("").to_string();
            let is_head = branch.is_head();
            let target_oid = branch
                .get()
                .target()
                .map(|o| o.to_string())
                .unwrap_or_default();

            local_branches.push(BranchInfo {
                name,
                is_head,
                target_oid,
                is_remote: false,
            });
        }
    }

    // 2. Remote Branches
    if let Ok(branches) = repo.branches(Some(BranchType::Remote)) {
        for branch_res in branches {
            let (branch, _) = branch_res?;
            let name = branch.name()?.unwrap_or("").to_string();
            // Filter out remote HEAD symbolic ref (e.g. origin/HEAD)
            if name.ends_with("/HEAD") || name == "HEAD" {
                continue;
            }
            let target_oid = branch
                .get()
                .target()
                .map(|o| o.to_string())
                .unwrap_or_default();

            remote_branches.push(BranchInfo {
                name,
                is_head: false,
                target_oid,
                is_remote: true,
            });
        }
    }

    Ok(BranchesSummary {
        local: local_branches,
        remote: remote_branches,
    })
}
