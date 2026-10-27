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
