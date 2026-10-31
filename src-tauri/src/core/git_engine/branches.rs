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

            let mut ahead = 0;
            let mut behind = 0;
            let mut upstream_name = None;

            if let Ok(upstream) = branch.upstream() {
                if let Ok(Some(u_name)) = upstream.name() {
                    upstream_name = Some(u_name.to_string());
                }
                if let (Some(local_oid), Some(upstream_oid)) =
                    (branch.get().target(), upstream.get().target())
                    && let Ok((a, b)) = repo.graph_ahead_behind(local_oid, upstream_oid)
                {
                    ahead = a;
                    behind = b;
                }
            }

            local_branches.push(BranchInfo {
                name,
                is_head,
                target_oid,
                is_remote: false,
                upstream_name,
                ahead,
                behind,
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
                upstream_name: None,
                ahead: 0,
                behind: 0,
            });
        }
    }

    Ok(BranchesSummary {
        local: local_branches,
        remote: remote_branches,
    })
}
