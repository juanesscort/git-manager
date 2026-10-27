import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ConflictedFileDetail } from "../../../types/git";

export function useConflictResolver(repoPath: string, onResolved?: () => void) {
  const [conflictedFiles, setConflictedFiles] = useState<string[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictedFileDetail | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkConflicts = useCallback(async () => {
    try {
      const files = await invoke<string[]>("check_repo_conflicts", { repoPath });
      setConflictedFiles(files);
      return files;
    } catch (err: unknown) {
      console.warn("Error comprobando conflictos", err);
      return [];
    }
  }, [repoPath]);

  const openConflictModal = async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await invoke<ConflictedFileDetail>("get_conflict_file_detail", {
        repoPath,
        relativePath: filePath,
      });
      setSelectedConflict(detail);
      setModalOpen(true);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (filePath: string, resolvedContent: string) => {
    setLoading(true);
    setError(null);
    try {
      await invoke("resolve_conflict_file_cmd", {
        repoPath,
        relativePath: filePath,
        resolvedContent,
      });
      setModalOpen(false);
      setSelectedConflict(null);
      await checkConflicts();
      if (onResolved) {
        onResolved();
      }
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    conflictedFiles,
    selectedConflict,
    modalOpen,
    loading,
    error,
    checkConflicts,
    openConflictModal,
    resolveConflict,
    closeModal: () => {
      setModalOpen(false);
      setSelectedConflict(null);
    },
  };
}
