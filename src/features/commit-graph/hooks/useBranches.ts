import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BranchesSummary } from "../../../types/git";

export function useBranches(repoPath: string) {
  const [currentRepoPath, setCurrentRepoPath] = useState<string>(repoPath);
  const [branches, setBranches] = useState<BranchesSummary>({ local: [], remote: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronously reset during render when repoPath changes
  if (currentRepoPath !== repoPath) {
    setCurrentRepoPath(repoPath);
    setBranches({ local: [], remote: [] });
    setLoading(Boolean(repoPath && repoPath !== "."));
  }

  const refreshBranches = useCallback(async () => {
    if (!repoPath || repoPath === ".") {
      setBranches({ local: [], remote: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const summary = await invoke<BranchesSummary>("get_repo_branches_cmd", {
        path: repoPath,
      });
      setBranches(summary);
    } catch (err: unknown) {
      console.warn("Error consultando ramas", err);
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  return {
    branches,
    loading,
    error,
    refreshBranches,
  };
}
