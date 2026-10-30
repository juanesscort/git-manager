use super::templates::commit::{COMMIT_SYSTEM_PROMPT, build_commit_user_prompt};
use super::templates::pull_request::{PR_SYSTEM_PROMPT, build_pr_user_prompt};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiTaskKind {
    CommitMessage,
    PullRequest,
}

#[derive(Debug, Clone)]
pub struct PromptContext<'a> {
    pub sanitized_diff: &'a str,
    pub head_branch: Option<&'a str>,
    pub base_branch: Option<&'a str>,
    pub commits_summary: &'a [String],
}

impl<'a> PromptContext<'a> {
    pub fn for_commit(sanitized_diff: &'a str) -> Self {
        Self {
            sanitized_diff,
            head_branch: None,
            base_branch: None,
            commits_summary: &[],
        }
    }

    pub fn for_pull_request(
        sanitized_diff: &'a str,
        head_branch: &'a str,
        base_branch: &'a str,
        commits_summary: &'a [String],
    ) -> Self {
        Self {
            sanitized_diff,
            head_branch: Some(head_branch),
            base_branch: Some(base_branch),
            commits_summary,
        }
    }
}

pub struct AiPromptRegistry;

impl AiPromptRegistry {
    pub fn system_prompt(task: AiTaskKind) -> &'static str {
        match task {
            AiTaskKind::CommitMessage => COMMIT_SYSTEM_PROMPT,
            AiTaskKind::PullRequest => PR_SYSTEM_PROMPT,
        }
    }

    pub fn user_prompt(task: AiTaskKind, context: &PromptContext) -> String {
        match task {
            AiTaskKind::CommitMessage => build_commit_user_prompt(context.sanitized_diff),
            AiTaskKind::PullRequest => {
                let head = context.head_branch.unwrap_or("dev");
                let base = context.base_branch.unwrap_or("main");
                build_pr_user_prompt(head, base, context.sanitized_diff, context.commits_summary)
            }
        }
    }
}
