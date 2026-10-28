import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DiffDelta, FileStatusItem } from "../../../types/git";

export function useStaging(repoPath: string, onCommitSuccess?: () => void) {
  const [files, setFiles] = useState<FileStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [diff, setDiff] = useState<DiffDelta | null>(null);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);

  const refreshStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await invoke<FileStatusItem[]>("get_repo_status", { path: repoPath });
      setFiles(items);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  const loadDiff = useCallback(
    async (filePath: string, staged: boolean) => {
      setSelectedFile({ path: filePath, staged });
      setDiffLoading(true);
      try {
        const delta = await invoke<DiffDelta>("get_diff_cmd", {
          path: repoPath,
          relativePath: filePath,
          staged,
        });
        setDiff(delta);
      } catch (err: unknown) {
        setDiff({
          path: filePath,
          patch: `Error al calcular diff: ${typeof err === "string" ? err : JSON.stringify(err)}`,
          lines_added: 0,
          lines_deleted: 0,
        });
      } finally {
        setDiffLoading(false);
      }
    },
    [repoPath]
  );

  const stageFile = async (relativePath: string) => {
    try {
      await invoke("stage_file_cmd", { path: repoPath, relativePath });
      await refreshStatuses();
      if (selectedFile?.path === relativePath) {
        await loadDiff(relativePath, true);
      }
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    }
  };

  const unstageFile = async (relativePath: string) => {
    try {
      await invoke("unstage_file_cmd", { path: repoPath, relativePath });
      await refreshStatuses();
      if (selectedFile?.path === relativePath) {
        await loadDiff(relativePath, false);
      }
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    }
  };

  const stageAll = async () => {
    try {
      await invoke("stage_all_cmd", { path: repoPath });
      await refreshStatuses();
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    }
  };

  const unstageAll = async () => {
    try {
      await invoke("unstage_all_cmd", { path: repoPath });
      await refreshStatuses();
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    }
  };

  const commitChanges = async (message: string): Promise<string | null> => {
    if (!message.trim()) return null;
    try {
      const newOid = await invoke<string>("commit_changes_cmd", { path: repoPath, message });
      setSelectedFile(null);
      setDiff(null);
      await refreshStatuses();
      if (onCommitSuccess) {
        onCommitSuccess();
      }
      return newOid;
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
      return null;
    }
  };

  useEffect(() => {
    setSelectedFile(null);
    setDiff(null);
    refreshStatuses();
  }, [refreshStatuses]);

  const stagedFiles = files.filter((f) => f.staged_status !== null && f.staged_status !== undefined);
  const unstagedFiles = files.filter(
    (f) => f.unstaged_status !== null && f.unstaged_status !== undefined
  );

  return {
    files,
    stagedFiles,
    unstagedFiles,
    loading,
    error,
    refreshStatuses,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    commitChanges,
    selectedFile,
    diff,
    diffLoading,
    loadDiff,
    clearSelectedFile: () => {
      setSelectedFile(null);
      setDiff(null);
    },
  };
}
