import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BranchesSummary } from "../../../types/git";

export function useBranches(repoPath: string) {
  const [branches, setBranches] = useState<BranchesSummary>({ local: [], remote: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBranches = useCallback(async () => {
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
