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
}

export interface CreateTagRequest {
  name: string;
  target_commit: string;
  message?: string;
}
