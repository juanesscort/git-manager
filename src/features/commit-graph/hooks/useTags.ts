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
      const [data, remoteNames] = await Promise.all([
        invoke<GitTag[]>("get_repo_tags_cmd", { path: repoPath }),
        invoke<string[]>("get_remote_tags_cmd", { path: repoPath }).catch(() => [] as string[]),
      ]);
      const remoteSet = new Set(remoteNames);
      const enriched = data.map((t) => ({
        ...t,
        is_remote: remoteSet.has(t.name),
      }));
      setTags(enriched);
    } catch (err: unknown) {
      console.warn("Error cargando etiquetas:", err);
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  const pushTag = useCallback(
    async (name: string): Promise<string> => {
      if (!repoPath) return "";
      try {
        const msg = await invoke<string>("push_tag_cmd", {
          path: repoPath,
          tagName: name,
        });
        await fetchTags();
        return msg;
      } catch (err: unknown) {
        console.error("Error subiendo etiqueta:", err);
        throw err;
      }
    },
    [repoPath, fetchTags]
  );

  const createTag = useCallback(
    async (
      name: string,
      targetCommit: string,
      message?: string,
      pushToRemote?: boolean
    ): Promise<boolean> => {
      if (!repoPath) return false;
      try {
        await invoke<GitTag>("create_tag_cmd", {
          path: repoPath,
          name,
          targetCommit,
          message: message?.trim() ? message.trim() : null,
        });
        if (pushToRemote) {
          try {
            await invoke<string>("push_tag_cmd", {
              path: repoPath,
              tagName: name,
            });
          } catch (pushErr) {
            console.warn("Tag creado pero falló push a remoto:", pushErr);
          }
        }
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

  const updateTag = useCallback(
    async (
      oldName: string,
      newName: string,
      targetCommit: string,
      message?: string
    ): Promise<boolean> => {
      if (!repoPath) return false;
      try {
        await invoke<GitTag>("update_tag_cmd", {
          path: repoPath,
          oldName,
          newName,
          targetCommit,
          message: message?.trim() ? message.trim() : null,
        });
        await fetchTags();
        return true;
      } catch (err: unknown) {
        console.error("Error actualizando etiqueta:", err);
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
    pushTag,
    createTag,
    updateTag,
    deleteTag,
  };
}
