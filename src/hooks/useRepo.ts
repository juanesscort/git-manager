import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RepoSummary } from "../types/git";

export function useRepo(initialPath: string = "") {
  const [repoPath, setRepoPath] = useState<string>(initialPath);
  const [summary, setSummary] = useState<RepoSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronously reset state during render on path switch to prevent leaking summary across tabs
  if (repoPath !== initialPath) {
    setRepoPath(initialPath);
    setSummary(null);
    setLoading(Boolean(initialPath && initialPath !== "."));
  }

  const refreshRepo = useCallback(async () => {
    if (!initialPath || initialPath === ".") {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<RepoSummary>("get_repo_info", { path: initialPath });
      setSummary(result);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [initialPath]);

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
