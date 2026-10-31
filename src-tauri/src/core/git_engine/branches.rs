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
                parent_branch: None,
                fork_point_oid: None,
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
                parent_branch: None,
                fork_point_oid: None,
            });
        }
    }

    // 3. Detect branch parent and fork point (nacimiento de ramas)
    let mut candidate_list: Vec<(String, String)> = local_branches
        .iter()
        .map(|b| (b.name.clone(), b.target_oid.clone()))
        .collect();

    for r in &remote_branches {
        if (r.name.ends_with("/main") || r.name.ends_with("/master") || r.name.ends_with("/dev"))
            && !candidate_list.iter().any(|(name, _)| name == &r.name)
        {
            candidate_list.push((r.name.clone(), r.target_oid.clone()));
        }
    }

    for branch in &mut local_branches {
        let (parent, fork_oid) =
            detect_branch_origin(repo, &branch.name, &branch.target_oid, &candidate_list);
        branch.parent_branch = parent;
        branch.fork_point_oid = fork_oid;
    }

    Ok(BranchesSummary {
        local: local_branches,
        remote: remote_branches,
    })
}

fn detect_branch_origin(
    repo: &Repository,
    branch_name: &str,
    branch_oid_str: &str,
    candidates: &[(String, String)],
) -> (Option<String>, Option<String>) {
    // If the branch is the root trunk (main or master), it has no parent
    if branch_name == "main" || branch_name == "master" {
        return (None, None);
    }

    let Ok(branch_oid) = git2::Oid::from_str(branch_oid_str) else {
        return (None, None);
    };

    let mut best_parent: Option<String> = None;
    let mut best_mb: Option<git2::Oid> = None;

    for (c_name, c_oid_str) in candidates {
        if c_name == branch_name {
            continue;
        }

        let Ok(c_oid) = git2::Oid::from_str(c_oid_str) else {
            continue;
        };

        if let Ok(mb) = repo.merge_base(branch_oid, c_oid) {
            match best_mb {
                None => {
                    best_parent = Some(c_name.clone());
                    best_mb = Some(mb);
                }
                Some(prev_mb) => {
                    // If current mb is a descendant of prev_mb, it is closer to branch_oid
                    if let Ok(true) = repo.graph_descendant_of(mb, prev_mb) {
                        best_parent = Some(c_name.clone());
                        best_mb = Some(mb);
                    } else if mb == prev_mb
                        && (c_name == "main"
                            || c_name == "master"
                            || c_name == "origin/main"
                            || c_name == "origin/master")
                    {
                        best_parent = Some(c_name.clone());
                    }
                }
            }
        }
    }

    (best_parent, best_mb.map(|o| o.to_string()))
}
