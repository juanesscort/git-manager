use super::errors::GitEngineError;
use crate::models::git_models::GitTagDto;
use git2::{Oid, Repository, Signature};

pub fn list_tags(repo: &Repository) -> Result<Vec<GitTagDto>, GitEngineError> {
    let tag_names = repo.tag_names(None)?;
    let mut tags = Vec::new();

    for name_res in tag_names.iter() {
        let name_str = match name_res {
            Ok(Some(n)) => n,
            _ => continue,
        };

        let refname = format!("refs/tags/{}", name_str);
        if let Ok(reference) = repo.find_reference(&refname) {
            // Try resolving as an annotated tag first
            if let Ok(target_obj) = reference.peel(git2::ObjectType::Any) {
                if let Ok(tag_obj) = repo.find_tag(target_obj.id()) {
                    let target_commit_id = tag_obj.target_id().to_string();
                    let short_target_id = if target_commit_id.len() >= 7 {
                        target_commit_id[..7].to_string()
                    } else {
                        target_commit_id.clone()
                    };

                    let tagger = tag_obj.tagger();
                    let tagger_name = tagger
                        .as_ref()
                        .and_then(|t| t.name().ok().map(|s| s.to_string()));
                    let tagger_email = tagger
                        .as_ref()
                        .and_then(|t| t.email().ok().map(|s| s.to_string()));
                    let msg = tag_obj
                        .message()
                        .ok()
                        .flatten()
                        .map(|m| m.trim().to_string());

                    tags.push(GitTagDto {
                        name: name_str.to_string(),
                        target_commit_id,
                        short_target_id,
                        message: msg,
                        tagger_name,
                        tagger_email,
                        timestamp: tagger.as_ref().map(|t| t.when().seconds()),
                        is_annotated: true,
                    });
                    continue;
                }

                // Lightweight tag pointing directly to a commit
                let commit_id = target_obj.id().to_string();
                let short_target_id = if commit_id.len() >= 7 {
                    commit_id[..7].to_string()
                } else {
                    commit_id.clone()
                };

                tags.push(GitTagDto {
                    name: name_str.to_string(),
                    target_commit_id: commit_id,
                    short_target_id,
                    message: None,
                    tagger_name: None,
                    tagger_email: None,
                    timestamp: None,
                    is_annotated: false,
                });
            }
        }
    }

    tags.sort_by_key(|a| a.name.to_lowercase());
    Ok(tags)
}

pub fn create_tag(
    repo: &Repository,
    name: &str,
    target_commit: &str,
    message: Option<&str>,
) -> Result<GitTagDto, GitEngineError> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Err(GitEngineError::InvalidPath(
            "Nombre de etiqueta vacío".to_string(),
        ));
    }

    let target_oid = if target_commit.trim().is_empty() || target_commit == "HEAD" {
        repo.head()?.peel_to_commit()?.id()
    } else {
        Oid::from_str(target_commit.trim())
            .map_err(|_| GitEngineError::CommitNotFound(target_commit.to_string()))?
    };

    let target_obj = repo.find_object(target_oid, Some(git2::ObjectType::Commit))?;
    let is_annotated = message.is_some_and(|m| !m.trim().is_empty());

    if is_annotated {
        let sig = repo.signature().unwrap_or_else(|_| {
            Signature::now("GitManager", "gitmanager@local")
                .unwrap_or_else(|_| Signature::now("User", "user@git").unwrap())
        });

        let msg = message.unwrap().trim();
        repo.tag(clean_name, &target_obj, &sig, msg, false)?;
    } else {
        repo.tag_lightweight(clean_name, &target_obj, false)?;
    }

    let target_commit_id = target_oid.to_string();
    let short_target_id = if target_commit_id.len() >= 7 {
        target_commit_id[..7].to_string()
    } else {
        target_commit_id.clone()
    };

    Ok(GitTagDto {
        name: clean_name.to_string(),
        target_commit_id,
        short_target_id,
        message: message.map(|m| m.trim().to_string()),
        tagger_name: if is_annotated {
            Some("GitManager".to_string())
        } else {
            None
        },
        tagger_email: None,
        timestamp: Some(chrono_like_now()),
        is_annotated,
    })
}

pub fn delete_tag(repo: &Repository, name: &str) -> Result<(), GitEngineError> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Err(GitEngineError::InvalidPath(
            "Nombre de etiqueta vacío".to_string(),
        ));
    }
    repo.tag_delete(clean_name)?;
    Ok(())
}

fn chrono_like_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
