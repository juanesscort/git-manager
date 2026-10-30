import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { UnifiedGitTag } from "../../../types/git";

export function useTags(repoPath: string | null) {
  const [tags, setTags] = useState<UnifiedGitTag[]>([]);
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
      const data = await invoke<UnifiedGitTag[]>("list_unified_tags_cmd", {
        path: repoPath,
      });
      setTags(data);
    } catch (err: unknown) {
      console.warn("Error cargando etiquetas unificadas:", err);
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

  const fetchTag = useCallback(
    async (name: string): Promise<string> => {
      if (!repoPath) return "";
      try {
        const msg = await invoke<string>("fetch_tag_cmd", {
          path: repoPath,
          tagName: name,
        });
        await fetchTags();
        return msg;
      } catch (err: unknown) {
        console.error("Error descargando etiqueta a local:", err);
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
        await invoke("create_tag_cmd", {
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
    async (
      name: string,
      deleteLocal = true,
      deleteRemote = false
    ): Promise<string> => {
      if (!repoPath) return "";
      try {
        const msg = await invoke<string>("delete_tag_cmd", {
          path: repoPath,
          name,
          deleteLocal,
          deleteRemote,
        });
        await fetchTags();
        return msg;
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
        await invoke("update_tag_cmd", {
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
    fetchTag,
    createTag,
    updateTag,
    deleteTag,
  };
}
