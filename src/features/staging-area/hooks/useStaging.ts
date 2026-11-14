import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DiffDelta, FileStatusItem } from "../../../types/git";

export function useStaging(repoPath: string, onCommitSuccess?: () => void) {
  const [currentRepoPath, setCurrentRepoPath] = useState<string>(repoPath);
  const [files, setFiles] = useState<FileStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [diff, setDiff] = useState<DiffDelta | null>(null);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);

  // Synchronously reset state during render on repoPath change to prevent leaking previous repo's files
  if (currentRepoPath !== repoPath) {
    setCurrentRepoPath(repoPath);
    setFiles([]);
    setLoading(Boolean(repoPath && repoPath !== "."));
    setSelectedFile(null);
    setDiff(null);
  }

  const currentPathRef = useRef(repoPath);
  currentPathRef.current = repoPath;

  const refreshStatuses = useCallback(async () => {
    if (!repoPath || repoPath === ".") {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await invoke<FileStatusItem[]>("get_repo_status", { path: repoPath });
      if (currentPathRef.current === repoPath) {
        setFiles(items);
      }
    } catch (err: unknown) {
      if (currentPathRef.current === repoPath) {
        setError(typeof err === "string" ? err : JSON.stringify(err));
      }
    } finally {
      if (currentPathRef.current === repoPath) {
        setLoading(false);
      }
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

  const discardFile = async (relativePath: string) => {
    try {
      await invoke("discard_unstaged_file_cmd", { path: repoPath, relativePath });
      await refreshStatuses();
      if (selectedFile?.path === relativePath) {
        setSelectedFile(null);
        setDiff(null);
      }
    } catch (err: unknown) {
      const msg = typeof err === "string" ? err : JSON.stringify(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const discardAll = async () => {
    try {
      await invoke("discard_all_unstaged_cmd", { path: repoPath });
      await refreshStatuses();
      if (selectedFile && !selectedFile.staged) {
        setSelectedFile(null);
        setDiff(null);
      }
    } catch (err: unknown) {
      const msg = typeof err === "string" ? err : JSON.stringify(err);
      setError(msg);
      throw new Error(msg);
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

  const isRepoMatch = currentRepoPath === repoPath;
  const effectiveFiles = isRepoMatch ? files : [];
  const effectiveLoading = !isRepoMatch || loading;

  const stagedFiles = effectiveFiles.filter((f) => f.staged_status !== null && f.staged_status !== undefined);
  const unstagedFiles = effectiveFiles.filter(
    (f) => f.unstaged_status !== null && f.unstaged_status !== undefined
  );

  return {
    files: effectiveFiles,
    stagedFiles,
    unstagedFiles,
    loading: effectiveLoading,
    error,
    refreshStatuses,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardFile,
    discardAll,
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
