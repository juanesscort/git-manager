use super::errors::GitHubError;
use crate::models::github_models::{
    CheckRunItem, GitHubUser, MergePullRequestPayload, PullRequestDetail, PullRequestItem,
    RemoteRepo, RepoPermissions, SubmitReviewPayload, WorkflowItem, WorkflowJob, WorkflowRun,
};
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde_json::Value;

pub async fn get_user_profile(token: &str) -> Result<GitHubUser, GitHubError> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://api.github.com/user")
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "GitHub API devolvió código {}",
            res.status()
        )));
    }

    let user: GitHubUser = res.json().await?;
    Ok(user)
}

pub async fn get_user_repositories(token: &str) -> Result<Vec<RemoteRepo>, GitHubError> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://api.github.com/user/repos?affiliation=owner,collaborator&sort=updated&per_page=100")
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "Error al listar repositorios: {}",
            res.status()
        )));
    }

    let repos: Vec<RemoteRepo> = res.json().await?;
    Ok(repos)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreatePullRequestPayload {
    pub title: String,
    pub head: String,
    pub base: String,
    pub body: Option<String>,
    pub draft: Option<bool>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CreatedPullRequestResponse {
    pub id: u64,
    pub number: u64,
    pub html_url: String,
    pub state: String,
    pub title: String,
}

pub async fn create_pull_request(
    token: &str,
    owner_repo: &str,
    payload: &CreatePullRequestPayload,
) -> Result<CreatedPullRequestResponse, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!("https://api.github.com/repos/{}/pulls", clean_repo);

    let res = client
        .post(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(payload)
        .send()
        .await?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "GitHub devolvió error al crear el Pull Request: {}",
            err_body
        )));
    }

    let pr: CreatedPullRequestResponse = res.json().await?;
    Ok(pr)
}

pub async fn get_repository_permissions(
    token: &str,
    owner_repo: &str,
) -> Result<RepoPermissions, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!("https://api.github.com/repos/{}", clean_repo);

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "No se pudo consultar el repositorio {} en GitHub: código {}",
            clean_repo,
            res.status()
        )));
    }

    let val: Value = res.json().await?;
    let perms_val = val.get("permissions");
    let admin = perms_val
        .and_then(|p| p.get("admin"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let maintain = perms_val
        .and_then(|p| p.get("maintain"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let push = perms_val
        .and_then(|p| p.get("push"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let triage = perms_val
        .and_then(|p| p.get("triage"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let pull = perms_val
        .and_then(|p| p.get("pull"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let role_name = if let Some(r) = val.get("role_name").and_then(|r| r.as_str()) {
        r.to_string()
    } else if admin {
        "admin".to_string()
    } else if maintain {
        "maintain".to_string()
    } else if push {
        "write".to_string()
    } else if triage {
        "triage".to_string()
    } else {
        "read".to_string()
    };

    Ok(RepoPermissions {
        admin,
        maintain,
        push,
        triage,
        pull,
        role_name,
    })
}

pub async fn list_repository_pulls(
    token: &str,
    owner_repo: &str,
    state: Option<&str>,
) -> Result<Vec<PullRequestItem>, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let state_param = state.unwrap_or("open");
    let url = format!(
        "https://api.github.com/repos/{}/pulls?state={}&sort=updated&per_page=50",
        clean_repo, state_param
    );

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "Error al listar Pull Requests de {}: {}",
            clean_repo,
            res.status()
        )));
    }

    let raw_list: Vec<Value> = res.json().await?;
    let mut items = Vec::new();

    for v in raw_list {
        let id = v.get("id").and_then(|i| i.as_u64()).unwrap_or_default();
        let number = v.get("number").and_then(|n| n.as_u64()).unwrap_or_default();
        let st = v
            .get("state")
            .and_then(|s| s.as_str())
            .unwrap_or("open")
            .to_string();
        let title = v
            .get("title")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string();
        let body = v
            .get("body")
            .and_then(|b| b.as_str())
            .map(|s| s.to_string());
        let created_at = v
            .get("created_at")
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string();
        let updated_at = v
            .get("updated_at")
            .and_then(|u| u.as_str())
            .unwrap_or("")
            .to_string();
        let html_url = v
            .get("html_url")
            .and_then(|h| h.as_str())
            .unwrap_or("")
            .to_string();
        let draft = v.get("draft").and_then(|d| d.as_bool()).unwrap_or(false);
        let comments_count = v.get("comments").and_then(|c| c.as_u64()).unwrap_or(0);

        let user: GitHubUser = match v.get("user") {
            Some(u) => serde_json::from_value(u.clone()).unwrap_or(GitHubUser {
                login: "desconocido".into(),
                name: None,
                avatar_url: "".into(),
                html_url: "".into(),
                public_repos: 0,
                total_private_repos: None,
            }),
            None => GitHubUser {
                login: "desconocido".into(),
                name: None,
                avatar_url: "".into(),
                html_url: "".into(),
                public_repos: 0,
                total_private_repos: None,
            },
        };

        let head_ref = v
            .get("head")
            .and_then(|h| h.get("ref"))
            .and_then(|r| r.as_str())
            .unwrap_or("")
            .to_string();
        let head_sha = v
            .get("head")
            .and_then(|h| h.get("sha"))
            .and_then(|s| s.as_str())
            .unwrap_or("")
            .to_string();
        let base_ref = v
            .get("base")
            .and_then(|b| b.get("ref"))
            .and_then(|r| r.as_str())
            .unwrap_or("")
            .to_string();
        let base_sha = v
            .get("base")
            .and_then(|b| b.get("sha"))
            .and_then(|s| s.as_str())
            .unwrap_or("")
            .to_string();

        items.push(PullRequestItem {
            id,
            number,
            state: st,
            title,
            user,
            body,
            created_at,
            updated_at,
            html_url,
            draft,
            head_ref,
            head_sha,
            base_ref,
            base_sha,
            comments_count,
        });
    }

    Ok(items)
}

pub async fn get_pull_request_details(
    token: &str,
    owner_repo: &str,
    pull_number: u64,
) -> Result<PullRequestDetail, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/pulls/{}",
        clean_repo, pull_number
    );

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Err(GitHubError::AuthFailed(format!(
            "Error al obtener detalle del Pull Request #{} en {}: {}",
            pull_number,
            clean_repo,
            res.status()
        )));
    }

    let v: Value = res.json().await?;
    let id = v.get("id").and_then(|i| i.as_u64()).unwrap_or_default();
    let number = v
        .get("number")
        .and_then(|n| n.as_u64())
        .unwrap_or(pull_number);
    let state = v
        .get("state")
        .and_then(|s| s.as_str())
        .unwrap_or("open")
        .to_string();
    let title = v
        .get("title")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();
    let body = v
        .get("body")
        .and_then(|b| b.as_str())
        .map(|s| s.to_string());
    let created_at = v
        .get("created_at")
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();
    let updated_at = v
        .get("updated_at")
        .and_then(|u| u.as_str())
        .unwrap_or("")
        .to_string();
    let html_url = v
        .get("html_url")
        .and_then(|h| h.as_str())
        .unwrap_or("")
        .to_string();
    let draft = v.get("draft").and_then(|d| d.as_bool()).unwrap_or(false);

    let user: GitHubUser = match v.get("user") {
        Some(u) => serde_json::from_value(u.clone()).unwrap_or(GitHubUser {
            login: "desconocido".into(),
            name: None,
            avatar_url: "".into(),
            html_url: "".into(),
            public_repos: 0,
            total_private_repos: None,
        }),
        None => GitHubUser {
            login: "desconocido".into(),
            name: None,
            avatar_url: "".into(),
            html_url: "".into(),
            public_repos: 0,
            total_private_repos: None,
        },
    };

    let head_ref = v
        .get("head")
        .and_then(|h| h.get("ref"))
        .and_then(|r| r.as_str())
        .unwrap_or("")
        .to_string();
    let head_sha = v
        .get("head")
        .and_then(|h| h.get("sha"))
        .and_then(|s| s.as_str())
        .unwrap_or("")
        .to_string();
    let base_ref = v
        .get("base")
        .and_then(|b| b.get("ref"))
        .and_then(|r| r.as_str())
        .unwrap_or("")
        .to_string();
    let base_sha = v
        .get("base")
        .and_then(|b| b.get("sha"))
        .and_then(|s| s.as_str())
        .unwrap_or("")
        .to_string();

    let additions = v.get("additions").and_then(|a| a.as_u64()).unwrap_or(0);
    let deletions = v.get("deletions").and_then(|d| d.as_u64()).unwrap_or(0);
    let changed_files = v.get("changed_files").and_then(|c| c.as_u64()).unwrap_or(0);
    let mergeable = v.get("mergeable").and_then(|m| m.as_bool());
    let mergeable_state = v
        .get("mergeable_state")
        .and_then(|m| m.as_str())
        .map(|s| s.to_string());

    Ok(PullRequestDetail {
        id,
        number,
        state,
        title,
        user,
        body,
        created_at,
        updated_at,
        html_url,
        draft,
        head_ref,
        head_sha,
        base_ref,
        base_sha,
        additions,
        deletions,
        changed_files,
        mergeable,
        mergeable_state,
    })
}

pub async fn get_pull_request_checks(
    token: &str,
    owner_repo: &str,
    head_sha: &str,
) -> Result<Vec<CheckRunItem>, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/commits/{}/check-runs",
        clean_repo, head_sha
    );

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        return Ok(Vec::new());
    }

    let val: Value = res.json().await?;
    let runs_val = val.get("check_runs").and_then(|r| r.as_array());
    let mut checks = Vec::new();

    if let Some(runs) = runs_val {
        for r in runs {
            let id = r.get("id").and_then(|i| i.as_u64()).unwrap_or_default();
            let name = r
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("Check")
                .to_string();
            let status = r
                .get("status")
                .and_then(|s| s.as_str())
                .unwrap_or("queued")
                .to_string();
            let conclusion = r
                .get("conclusion")
                .and_then(|c| c.as_str())
                .map(|s| s.to_string());
            let html_url = r
                .get("html_url")
                .and_then(|h| h.as_str())
                .map(|s| s.to_string());

            checks.push(CheckRunItem {
                id,
                name,
                status,
                conclusion,
                html_url,
            });
        }
    }

    Ok(checks)
}

pub async fn submit_pull_request_review(
    token: &str,
    owner_repo: &str,
    pull_number: u64,
    payload: &SubmitReviewPayload,
) -> Result<(), GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/pulls/{}/reviews",
        clean_repo, pull_number
    );

    let mut body_map = serde_json::Map::new();
    body_map.insert("event".into(), Value::String(payload.event.clone()));
    if let Some(ref b) = payload.body {
        body_map.insert("body".into(), Value::String(b.clone()));
    }

    let res = client
        .post(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&Value::Object(body_map))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al enviar revisión en GitHub: {}",
            err_text
        )));
    }

    Ok(())
}

pub async fn merge_pull_request(
    token: &str,
    owner_repo: &str,
    pull_number: u64,
    payload: &MergePullRequestPayload,
) -> Result<(), GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/pulls/{}/merge",
        clean_repo, pull_number
    );

    let mut body_map = serde_json::Map::new();
    body_map.insert(
        "merge_method".into(),
        Value::String(payload.merge_method.clone()),
    );
    if let Some(ref t) = payload.commit_title {
        body_map.insert("commit_title".into(), Value::String(t.clone()));
    }
    if let Some(ref m) = payload.commit_message {
        body_map.insert("commit_message".into(), Value::String(m.clone()));
    }

    let res = client
        .put(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&Value::Object(body_map))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al fusionar Pull Request #{}: {}",
            pull_number, err_text
        )));
    }

    Ok(())
}

pub async fn list_workflow_runs(
    token: &str,
    owner_repo: &str,
    workflow_id: Option<u64>,
    branch: Option<&str>,
    status: Option<&str>,
    per_page: Option<u32>,
) -> Result<Vec<WorkflowRun>, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let limit = per_page.unwrap_or(30);

    let mut url = match workflow_id {
        Some(w_id) => format!(
            "https://api.github.com/repos/{}/actions/workflows/{}/runs?per_page={}",
            clean_repo, w_id, limit
        ),
        None => format!(
            "https://api.github.com/repos/{}/actions/runs?per_page={}",
            clean_repo, limit
        ),
    };

    if let Some(b) = branch
        && !b.is_empty()
    {
        url.push_str(&format!("&branch={}", b));
    }
    if let Some(s) = status
        && !s.is_empty()
        && s != "all"
    {
        url.push_str(&format!("&status={}", s));
    }

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al listar ejecuciones de GitHub Actions: {}",
            err_text
        )));
    }

    let val: Value = res.json().await?;
    let runs_val = val.get("workflow_runs").and_then(|v| v.as_array());
    let mut runs = Vec::new();
    if let Some(arr) = runs_val {
        for item in arr {
            if let Ok(run) = serde_json::from_value::<WorkflowRun>(item.clone()) {
                runs.push(run);
            }
        }
    }

    Ok(runs)
}

pub async fn list_repository_workflows(
    token: &str,
    owner_repo: &str,
) -> Result<Vec<WorkflowItem>, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/actions/workflows",
        clean_repo
    );

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al listar workflows de {}: {}",
            clean_repo, err_text
        )));
    }

    let val: Value = res.json().await?;
    let workflows_val = val.get("workflows").and_then(|v| v.as_array());
    let mut workflows = Vec::new();
    if let Some(arr) = workflows_val {
        for item in arr {
            if let Ok(w) = serde_json::from_value::<WorkflowItem>(item.clone()) {
                workflows.push(w);
            }
        }
    }

    Ok(workflows)
}

pub async fn list_workflow_run_jobs(
    token: &str,
    owner_repo: &str,
    run_id: u64,
) -> Result<Vec<WorkflowJob>, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/actions/runs/{}/jobs",
        clean_repo, run_id
    );

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al obtener jobs del run #{}: {}",
            run_id, err_text
        )));
    }

    let val: Value = res.json().await?;
    let jobs_val = val.get("jobs").and_then(|v| v.as_array());
    let mut jobs = Vec::new();
    if let Some(arr) = jobs_val {
        for item in arr {
            if let Ok(j) = serde_json::from_value::<WorkflowJob>(item.clone()) {
                jobs.push(j);
            }
        }
    }

    Ok(jobs)
}

pub async fn get_workflow_job_logs(
    token: &str,
    owner_repo: &str,
    job_id: u64,
) -> Result<String, GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/actions/jobs/{}/logs",
        clean_repo, job_id
    );

    let res = client
        .get(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "No se pudieron cargar los logs del job #{}: {}",
            job_id, err_text
        )));
    }

    let log_text = res.text().await.unwrap_or_default();
    Ok(log_text)
}

pub async fn cancel_workflow_run(
    token: &str,
    owner_repo: &str,
    run_id: u64,
) -> Result<(), GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/actions/runs/{}/cancel",
        clean_repo, run_id
    );

    let res = client
        .post(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al cancelar la ejecución #{}: {}",
            run_id, err_text
        )));
    }

    Ok(())
}

pub async fn rerun_workflow_run(
    token: &str,
    owner_repo: &str,
    run_id: u64,
    failed_only: bool,
) -> Result<(), GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let endpoint = if failed_only {
        "rerun-failed-jobs"
    } else {
        "rerun"
    };
    let url = format!(
        "https://api.github.com/repos/{}/actions/runs/{}/{}",
        clean_repo, run_id, endpoint
    );

    let res = client
        .post(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al reintentar la ejecución #{}: {}",
            run_id, err_text
        )));
    }

    Ok(())
}

pub async fn dispatch_workflow(
    token: &str,
    owner_repo: &str,
    workflow_id_or_file: &str,
    branch_ref: &str,
) -> Result<(), GitHubError> {
    let client = reqwest::Client::new();
    let clean_repo = owner_repo.trim_end_matches(".git").trim();
    let url = format!(
        "https://api.github.com/repos/{}/actions/workflows/{}/dispatches",
        clean_repo, workflow_id_or_file
    );

    let body = serde_json::json!({
        "ref": branch_ref
    });

    let res = client
        .post(&url)
        .header(USER_AGENT, "Git-Manager-Desktop")
        .header(ACCEPT, "application/vnd.github+json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&body)
        .send()
        .await?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(GitHubError::AuthFailed(format!(
            "Error al disparar el workflow {}: {}",
            workflow_id_or_file, err_text
        )));
    }

    Ok(())
}
