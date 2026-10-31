export type FileStatusKind =
  | "Untracked"
  | "Modified"
  | "Deleted"
  | "Added"
  | "Renamed"
  | "Conflicted";

export interface FileStatusItem {
  path: string;
  staged_status?: FileStatusKind | null;
  unstaged_status?: FileStatusKind | null;
  is_conflicted: boolean;
}

export interface RepoSummary {
  path: string;
  current_branch?: string | null;
  is_empty: boolean;
  is_bare: boolean;
  head_commit_oid?: string | null;
  remote_url?: string | null;
}

export interface CommitInfo {
  oid: string;
  short_oid: string;
  summary: string;
  message: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  parent_oids: string[];
}

export interface DiffDelta {
  path: string;
  patch: string;
  lines_added: number;
  lines_deleted: number;
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  target_oid: string;
  is_remote: boolean;
  upstream_name?: string | null;
  ahead?: number;
  behind?: number;
}

export interface FileMediaPreview {
  path: string;
  mime_type: string;
  data_base64: string;
  old_data_base64?: string | null;
  size_bytes: number;
  old_size_bytes?: number | null;
  is_svg: boolean;
  is_lottie: boolean;
  is_image: boolean;
}

export interface BranchesSummary {
  local: BranchInfo[];
  remote: BranchInfo[];
}

export interface CommitFileChange {
  path: string;
  status: FileStatusKind;
  lines_added: number;
  lines_deleted: number;
}

export interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GitHubUser {
  login: string;
  name?: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos?: number | null;
}

export interface RemoteRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  description?: string | null;
  updated_at: string;
}

export interface AiConfig {
  provider: string; // "gemini" | "ollama" | "openai"
  model: string;
  base_url?: string | null;
  has_api_key: boolean;
}

export interface SaveAiConfigRequest {
  provider: string;
  api_key?: string;
  model?: string;
  base_url?: string;
}

export interface ConflictBlock {
  id: number;
  ours: string;
  theirs: string;
  base: string;
  start_line: number;
  end_line: number;
}

export interface ConflictedFileDetail {
  path: string;
  ours_content: string;
  theirs_content: string;
  base_content: string;
  current_workdir_content: string;
  blocks: ConflictBlock[];
}

export interface GitTag {
  name: string;
  target_commit_id: string;
  short_target_id: string;
  message?: string | null;
  tagger_name?: string | null;
  tagger_email?: string | null;
  timestamp?: number | null;
  is_annotated: boolean;
  is_remote?: boolean;
}

export interface CreateTagRequest {
  name: string;
  target_commit: string;
  message?: string;
}

export interface BranchDiffCheckResult {
  has_changes: boolean;
  commits_count: number;
  commits_summary: string[];
  stat_summary: string;
  is_up_to_date: boolean;
}

export interface UnifiedGitTag {
  name: string;
  target_commit_id?: string | null;
  short_target_id?: string | null;
  message?: string | null;
  tagger_name?: string | null;
  timestamp?: number | null;
  is_annotated: boolean;
  is_local: boolean;
  is_remote: boolean;
}

export interface WorkflowRun {
  id: number;
  name?: string | null;
  display_title?: string | null;
  run_number: number;
  event: string;
  status: string;
  conclusion?: string | null;
  workflow_id: number;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string | null;
  head_branch?: string | null;
  head_sha: string;
  actor?: GitHubUser | null;
  run_attempt?: number | null;
}

export interface WorkflowItem {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
}

export interface WorkflowJobStep {
  name: string;
  status: string;
  conclusion?: string | null;
  number: number;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  html_url?: string | null;
  steps: WorkflowJobStep[];
}

export interface RepoPermissions {
  admin: boolean;
  maintain: boolean;
  push: boolean;
  triage: boolean;
  pull: boolean;
  role_name: string;
}

export interface PullRequestItem {
  id: number;
  number: number;
  state: string;
  title: string;
  user: GitHubUser;
  body?: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  draft: boolean;
  head_ref: string;
  head_sha: string;
  base_ref: string;
  base_sha: string;
  comments_count: number;
}

export interface PullRequestDetail {
  id: number;
  number: number;
  state: string;
  title: string;
  user: GitHubUser;
  body?: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  draft: boolean;
  head_ref: string;
  head_sha: string;
  base_ref: string;
  base_sha: string;
  additions: number;
  deletions: number;
  changed_files: number;
  mergeable?: boolean | null;
  mergeable_state?: string | null;
}

export interface CheckRunItem {
  id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  html_url?: string | null;
}

export interface ReviewPullRequestRequest {
  title: string;
  description: string;
  head_branch: string;
  base_branch: string;
  additions: number;
  deletions: number;
  changed_files: number;
  commits_summary: string[];
}
