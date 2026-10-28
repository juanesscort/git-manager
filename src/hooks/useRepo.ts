import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RepoSummary } from "../types/git";

export function useRepo(initialPath: string = ".") {
  const [repoPath, setRepoPath] = useState<string>(initialPath);
  const [summary, setSummary] = useState<RepoSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRepoPath(initialPath);
  }, [initialPath]);

  const refreshRepo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<RepoSummary>("get_repo_info", { path: repoPath });
      setSummary(result);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    refreshRepo();
  }, [refreshRepo]);

  return {
    repoPath,
    setRepoPath,
    summary,
    loading,
    error,
    refreshRepo,
  };
}
