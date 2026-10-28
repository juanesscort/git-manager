import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CommitFileChange, CommitInfo, DiffDelta } from "../../../types/git";

export function useCommitDetails(repoPath: string, selectedCommit: CommitInfo | null) {
  const [files, setFiles] = useState<CommitFileChange[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<DiffDelta | null>(null);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);

  const fetchCommitFiles = useCallback(async () => {
    if (!selectedCommit?.oid) {
      setFiles([]);
      setSelectedFile(null);
      setFileDiff(null);
      return;
    }

    setLoading(true);
    try {
      const changedFiles = await invoke<CommitFileChange[]>("get_commit_files_cmd", {
        path: repoPath,
        commitOid: selectedCommit.oid,
      });
      setFiles(changedFiles);
      if (changedFiles.length > 0) {
        // Auto select first file to show its diff immediately
        const first = changedFiles[0];
        setSelectedFile(first.path);
        loadCommitFileDiff(selectedCommit.oid, first.path);
      } else {
        setSelectedFile(null);
        setFileDiff(null);
      }
    } catch (err: unknown) {
      console.warn("Error cargando archivos del commit", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [repoPath, selectedCommit]);

  const loadCommitFileDiff = async (commitOid: string, relativePath: string) => {
    setSelectedFile(relativePath);
    setDiffLoading(true);
    try {
      const delta = await invoke<DiffDelta>("get_commit_file_diff_cmd", {
        path: repoPath,
        commitOid,
        relativePath,
      });
      setFileDiff(delta);
    } catch (err: unknown) {
      setFileDiff({
        path: relativePath,
        patch: `Error obteniendo diff: ${typeof err === "string" ? err : JSON.stringify(err)}`,
        lines_added: 0,
        lines_deleted: 0,
      });
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitFiles();
  }, [fetchCommitFiles]);

  return {
    files,
    loading,
    selectedFile,
    fileDiff,
    diffLoading,
    selectFile: (path: string) => {
      if (selectedCommit) {
        loadCommitFileDiff(selectedCommit.oid, path);
      }
    },
    clearFileDiff: () => {
      setSelectedFile(null);
      setFileDiff(null);
    },
  };
}
