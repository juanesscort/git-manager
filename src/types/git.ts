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
