import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface GitToolbarState {
  operating: boolean;
  activeOp: string | null;
  message: string | null;
  error: string | null;
}

export function useGitToolbar(repoPath: string, onOperationSuccess?: () => void) {
  const [state, setState] = useState<GitToolbarState>({
    operating: false,
    activeOp: null,
    message: null,
    error: null,
  });

  const clearNotification = useCallback(() => {
    setState((prev) => ({ ...prev, message: null, error: null }));
  }, []);

  const setNotification = useCallback((message: string | null, error: string | null = null) => {
    setState((prev) => ({ ...prev, message, error }));
    if (message) {
      setTimeout(() => {
        setState((prev) => (prev.activeOp === null ? { ...prev, message: null } : prev));
      }, 5000);
    }
  }, []);

  const runOperation = useCallback(
    async (opName: string, invokeName: string, args: Record<string, unknown> = {}) => {
      setState({
        operating: true,
        activeOp: opName,
        message: null,
        error: null,
      });

      try {
        const result = await invoke<string | void>(invokeName, {
          path: repoPath,
          ...args,
        });

        const successMsg =
          typeof result === "string" && result.trim()
            ? result.trim()
            : `Operación ${opName} completada con éxito.`;

        setState({
          operating: false,
          activeOp: null,
          message: successMsg,
          error: null,
        });

        if (onOperationSuccess) {
          onOperationSuccess();
        }

        setTimeout(() => {
          setState((prev) => (prev.activeOp === null ? { ...prev, message: null } : prev));
        }, 5000);
      } catch (err: unknown) {
        const errorMsg =
          typeof err === "string"
            ? err
            : err instanceof Error
            ? err.message
            : JSON.stringify(err);

        setState({
          operating: false,
          activeOp: null,
          message: null,
          error: errorMsg,
        });
      }
    },
    [repoPath, onOperationSuccess]
  );

  const fetchRemote = useCallback(() => runOperation("Fetch", "git_fetch_cmd"), [runOperation]);
  const pullRemote = useCallback(() => runOperation("Pull", "git_pull_cmd"), [runOperation]);
  const pushRemote = useCallback(() => runOperation("Push", "git_push_cmd"), [runOperation]);
  const stashChanges = useCallback(() => runOperation("Stash", "git_stash_cmd"), [runOperation]);
  const popStash = useCallback(() => runOperation("Pop Stash", "git_stash_pop_cmd"), [runOperation]);

  const createNewBranch = useCallback(
    (branchName: string, baseBranch?: string) => {
      if (!branchName.trim()) return;
      return runOperation("Nueva Rama", "create_branch_cmd", {
        branchName: branchName.trim(),
        baseBranch: baseBranch?.trim() || null,
      });
    },
    [runOperation]
  );

  const checkoutBranch = useCallback(
    (branchName: string) => {
      if (!branchName.trim()) return;
      return runOperation(`Checkout ${branchName}`, "checkout_branch_cmd", {
        branchName: branchName.trim(),
      });
    },
    [runOperation]
  );

  const deleteBranch = useCallback(
    (branchName: string) => {
      if (!branchName.trim()) return;
      return runOperation(`Eliminar ${branchName}`, "delete_branch_cmd", {
        branchName: branchName.trim(),
      });
    },
    [runOperation]
  );

  const renameBranch = useCallback(
    (oldName: string, newName: string) => {
      if (!oldName.trim() || !newName.trim()) return;
      return runOperation(`Renombrar ${oldName}`, "rename_branch_cmd", {
        oldName: oldName.trim(),
        newName: newName.trim(),
      });
    },
    [runOperation]
  );

  const mergeBranch = useCallback(
    (sourceBranch: string, targetBranch?: string) => {
      if (!sourceBranch.trim()) return;
      return runOperation(`Merge ${sourceBranch}`, "git_merge_cmd", {
        sourceBranch: sourceBranch.trim(),
        targetBranch: targetBranch?.trim() || null,
      });
    },
    [runOperation]
  );

  const rebaseBranch = useCallback(
    (upstreamBranch: string) => {
      if (!upstreamBranch.trim()) return;
      return runOperation(`Rebase ${upstreamBranch}`, "git_rebase_cmd", {
        upstreamBranch: upstreamBranch.trim(),
      });
    },
    [runOperation]
  );

  return {
    ...state,
    fetchRemote,
    pullRemote,
    pushRemote,
    stashChanges,
    popStash,
    createNewBranch,
    checkoutBranch,
    deleteBranch,
    renameBranch,
    mergeBranch,
    rebaseBranch,
    clearNotification,
    setNotification,
  };
}
