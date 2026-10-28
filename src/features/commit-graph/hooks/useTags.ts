import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GitTag } from "../../../types/git";

export function useTags(repoPath: string | null) {
  const [tags, setTags] = useState<GitTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    if (!repoPath) {
      setTags([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<GitTag[]>("get_repo_tags_cmd", { path: repoPath });
      setTags(data);
    } catch (err: unknown) {
      console.warn("Error cargando etiquetas:", err);
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  const createTag = useCallback(
    async (name: string, targetCommit: string, message?: string): Promise<boolean> => {
      if (!repoPath) return false;
      try {
        await invoke<GitTag>("create_tag_cmd", {
          path: repoPath,
          name,
          targetCommit,
          message: message?.trim() ? message.trim() : null,
        });
        await fetchTags();
        return true;
      } catch (err: unknown) {
        console.error("Error creando etiqueta:", err);
        throw err;
      }
    },
    [repoPath, fetchTags]
  );

  const deleteTag = useCallback(
    async (name: string): Promise<boolean> => {
      if (!repoPath) return false;
      try {
        await invoke("delete_tag_cmd", {
          path: repoPath,
          name,
        });
        await fetchTags();
        return true;
      } catch (err: unknown) {
        console.error("Error eliminando etiqueta:", err);
        throw err;
      }
    },
    [repoPath, fetchTags]
  );

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    refreshTags: fetchTags,
    createTag,
    deleteTag,
  };
}
