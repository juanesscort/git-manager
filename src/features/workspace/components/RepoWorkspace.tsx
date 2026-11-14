import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  GitBranch,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  Cloud,
  Tag,
  FileText,
} from "lucide-react";
import logoImg from "../../../assets/logo.png";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button } from "../../../components/ui/Button";
import { Splitter } from "../../../components/ui/Splitter";
import { CreateBranchModal } from "../../../components/ui/CreateBranchModal";
import { BranchMergeModal } from "../../../components/ui/BranchMergeModal";
import { BranchContextMenu, BranchContextMenuState } from "../../../components/ui/BranchContextMenu";
import { CommitContextMenu, CommitContextMenuState } from "../../../components/ui/CommitContextMenu";
import { FileContextMenu, FileContextMenuState } from "../../../components/ui/FileContextMenu";
import { CreatePullRequestModal } from "../../github-sync/components/CreatePullRequestModal";
import { PullRequestHubModal } from "../../github-sync/components/pr-hub/PullRequestHubModal";
import { ActionsHubModal } from "../../github-sync/components/actions-hub/ActionsHubModal";
import { ReleaseWizardModal } from "../../git-ops/components/ReleaseWizardModal";
import { useGitHubActions } from "../../github-sync/hooks/useGitHubActions";
import { EmbeddedTerminal } from "../../../components/ui/EmbeddedTerminal";
import { AccordionSection } from "../../../components/ui/AccordionSection";
import { TagListView } from "../../commit-graph/components/TagListView";
import { CreateTagModal } from "../../commit-graph/components/CreateTagModal";
import { TagDetailsModal } from "../../commit-graph/components/TagDetailsModal";
import { UndoCommitModal } from "../../commit-graph/components/UndoCommitModal";
import { DiscardChangesModal } from "../../staging-area/components/DiscardChangesModal";
import {
  GraphToolbarControls,
  GraphViewMode,
  VisibleColumns,
} from "../../commit-graph/components/GraphToolbarControls";
import { GitToolbar } from "../../git-ops/components/GitToolbar";
import { useGitToolbar } from "../../../hooks/useGitToolbar";
import { useRepo } from "../../../hooks/useRepo";
import { useStaging } from "../../staging-area/hooks/useStaging";
import { useCommitGraph } from "../../commit-graph/hooks/useCommitGraph";
import { useBranches } from "../../commit-graph/hooks/useBranches";
import { useTags } from "../../commit-graph/hooks/useTags";
import { useCommitDetails } from "../../commit-graph/hooks/useCommitDetails";
import { useConflictResolver } from "../../conflict-resolver/hooks/useConflictResolver";
import { useAiAssistant } from "../../ai-assistant/hooks/useAiAssistant";
import { StagingArea } from "../../staging-area/components/StagingArea";
import { CommitGraph } from "../../commit-graph/components/CommitGraph";
import { BranchTreeView } from "../../commit-graph/components/BranchTreeView";
import { DiffViewer } from "../../staging-area/components/DiffViewer";
import { CommitDetailsPanel } from "../../commit-graph/components/CommitDetailsPanel";
import { ConflictResolverModal } from "../../conflict-resolver/components/ConflictResolverModal";
import {
  CommitInfo,
  DiffDelta,
  GitHubUser,
  PullRequestItem,
  UnifiedGitTag,
} from "../../../types/git";

export interface OpenDiffTab {
  id: string;
  path: string;
  name: string;
  type: "staging" | "commit";
  staged?: boolean;
  commitOid?: string;
}

export interface RepoWorkspaceProps {
  tabId: string;
  tabName: string;
  repoPath: string;
  isActive: boolean;
  user: GitHubUser | null;
  onUpdateBranch: (branchName: string) => void;
  onUpdatePendingChanges: (count: number) => void;
  onOpenSettings: (tab: "ai" | "about") => void;
}

export const RepoWorkspace: React.FC<RepoWorkspaceProps> = ({
  tabId: _tabId,
  tabName,
  repoPath,
  isActive,
  user: githubUser,
  onUpdateBranch,
  onUpdatePendingChanges,
  onOpenSettings,
}) => {
  // 1. Core Repository Hook
  const { summary, refreshRepo } = useRepo(repoPath);

  // Sync active branch to parent tab
  useEffect(() => {
    if (summary?.current_branch) {
      onUpdateBranch(summary.current_branch);
    }
  }, [summary?.current_branch, onUpdateBranch]);

  // 2. Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);

  // 3. Resizable Panels & Collapsed States
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem("gitmanager_panel_left_width");
    return saved ? Math.max(180, Math.min(500, parseInt(saved, 10))) : 280;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const saved = localStorage.getItem("gitmanager_panel_right_width");
    return saved ? Math.max(280, Math.min(650, parseInt(saved, 10))) : 340;
  });
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("gitmanager_panel_left_collapsed") === "true";
  });
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("gitmanager_panel_right_collapsed") === "true";
  });

  const handleToggleLeftPanel = () => {
    setLeftCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("gitmanager_panel_left_collapsed", next ? "true" : "false");
      return next;
    });
  };

  const handleToggleRightPanel = () => {
    setRightCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("gitmanager_panel_right_collapsed", next ? "true" : "false");
      return next;
    });
  };

  const [diffHeight, setDiffHeight] = useState<number>(320);

  // 4. Center Area & Multi-Tab Diff Management
  const [centerViewMode, setCenterViewMode] = useState<"full" | "split">("full");
  const [activeCenterTab, setActiveCenterTab] = useState<string>("graph");
  const [openDiffTabs, setOpenDiffTabs] = useState<OpenDiffTab[]>([]);
  const [tabLimitWarning, setTabLimitWarning] = useState<string | null>(null);
  const [isWipSelected, setIsWipSelected] = useState<boolean>(false);
  const [diffCache, setDiffCache] = useState<Record<string, DiffDelta>>({});
  const [diffLoadingMap, setDiffLoadingMap] = useState<Record<string, boolean>>({});
  const tabWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [branchModalOpen, setBranchModalOpen] = useState<boolean>(false);
  const [prHubOpen, setPrHubOpen] = useState<boolean>(false);
  const [hubSelectedPrNumber, setHubSelectedPrNumber] = useState<number | null>(null);
  const [openPrCount, setOpenPrCount] = useState<number>(0);

  // 5. Commit Graph Preferences
  const [showCommitBody, setShowCommitBody] = useState<boolean>(() => {
    return localStorage.getItem("gitmanager_show_commit_body") === "true";
  });
  const [graphSearchQuery, setGraphSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
    const saved = localStorage.getItem("gitmanager_visible_columns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return { author: true, date: true, hash: true };
  });
  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>(() => {
    const saved = localStorage.getItem("gitmanager_graph_view_mode");
    return (saved as GraphViewMode) || "normal";
  });

  const handleToggleColumn = (col: keyof VisibleColumns) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [col]: !prev[col] };
      localStorage.setItem("gitmanager_visible_columns", JSON.stringify(updated));
      return updated;
    });
  };

  const handleChangeViewMode = (mode: GraphViewMode) => {
    setGraphViewMode(mode);
    localStorage.setItem("gitmanager_graph_view_mode", mode);
  };

  const handleResetColumnWidths = () => {
    window.dispatchEvent(new Event("gitmanager_reset_col_widths"));
  };

  const handleToggleShowCommitBody = (show: boolean) => {
    setShowCommitBody(show);
    localStorage.setItem("gitmanager_show_commit_body", show ? "true" : "false");
  };

  // 6. Domain Hooks for this specific repository
  const {
    graphNodes,
    selectedCommit,
    loading: commitsLoading,
    setSelectedCommit,
    refreshCommits,
  } = useCommitGraph(repoPath);

  const { branches, refreshBranches } = useBranches(repoPath);

  const {
    tags,
    refreshTags,
    pushTag,
    fetchTag,
    createTag,
    updateTag,
    deleteTag,
  } = useTags(repoPath);

  // AI Assistant Hook for generating commit messages
  const {
    generating: aiGenerating,
    generateCommit,
  } = useAiAssistant();

  const handleGenerateAiCommit = async (): Promise<string | null> => {
    if (!repoPath) return null;
    return await generateCommit(repoPath);
  };

  const [createTagModalOpen, setCreateTagModalOpen] = useState(false);
  const [tagDetailsModalOpen, setTagDetailsModalOpen] = useState(false);
  const [tagModalInitialDelete, setTagModalInitialDelete] = useState(false);
  const [selectedTagForModal, setSelectedTagForModal] = useState<UnifiedGitTag | null>(null);
  const [targetCommitForTag, setTargetCommitForTag] = useState<{ oid: string; summary?: string }>({
    oid: "HEAD",
  });

  const [actionsHubOpen, setActionsHubOpen] = useState(false);
  const [releaseWizardOpen, setReleaseWizardOpen] = useState(false);
  const [isGitManagerRepo, setIsGitManagerRepo] = useState(false);

  const [undoCommitModalOpen, setUndoCommitModalOpen] = useState(false);
  const [commitToUndo, setCommitToUndo] = useState<CommitInfo | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Check if current repo is Git-Manager
  useEffect(() => {
    if (!repoPath) {
      setIsGitManagerRepo(false);
      return;
    }
    invoke<boolean>("is_git_manager_repo_cmd", { path: repoPath })
      .then((isGm) => setIsGitManagerRepo(isGm))
      .catch(() => setIsGitManagerRepo(false));
  }, [repoPath]);

  // Actions Repo Slug & Hook
  const actionsRepoSlug = useMemo(() => {
    if (!summary?.remote_url) return "";
    let clean = summary.remote_url.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "");
    } else if (clean.startsWith("https://github.com/")) {
      clean = clean.replace("https://github.com/", "");
    }
    return clean.replace(/\.git$/, "");
  }, [summary?.remote_url]);

  const { activeRunsCount, latestRunStatus, fetchRuns } = useGitHubActions(actionsRepoSlug);
  const [isReleaseTriggered, setIsReleaseTriggered] = useState<boolean>(false);

  useEffect(() => {
    if (activeRunsCount > 0 && isReleaseTriggered) {
      setIsReleaseTriggered(false);
    }
  }, [activeRunsCount, isReleaseTriggered]);

  useEffect(() => {
    if (!isReleaseTriggered) return;
    const timer = setTimeout(() => setIsReleaseTriggered(false), 60000);
    return () => clearTimeout(timer);
  }, [isReleaseTriggered]);

  const effectiveActiveRunsCount = isReleaseTriggered ? Math.max(activeRunsCount, 1) : activeRunsCount;
  const effectiveActionsStatus = isReleaseTriggered && activeRunsCount === 0 ? "in_progress" : latestRunStatus;

  // Selected Commit Files
  const {
    files: commitFiles,
    loading: commitFilesLoading,
  } = useCommitDetails(repoPath, selectedCommit);

  // Staging Area Hook
  const {
    stagedFiles,
    unstagedFiles,
    loading: stagingLoading,
    refreshStatuses,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardFile,
    discardAll,
    commitChanges,
  } = useStaging(repoPath, () => {
    refreshCommits();
    refreshRepo();
    refreshBranches();
    refreshTags();
    checkConflicts();
  });

  // Conflict Resolver Hook
  const {
    conflictedFiles: _conflictedFiles,
    selectedConflict,
    modalOpen: conflictModalOpen,
    loading: conflictLoading,
    checkConflicts,
    openConflictModal,
    resolveConflict,
    closeModal: closeConflictModal,
  } = useConflictResolver(repoPath, () => {
    refreshStatuses();
    refreshCommits();
    refreshRepo();
    refreshBranches();
    refreshTags();
  });

  useEffect(() => {
    checkConflicts();
  }, [checkConflicts]);

  // Update parent tab's badge whenever pending changes count changes
  const pendingChangesCount = stagedFiles.length + unstagedFiles.length;
  useEffect(() => {
    if (!stagingLoading) {
      onUpdatePendingChanges(pendingChangesCount);
    }
  }, [stagingLoading, pendingChangesCount, onUpdatePendingChanges]);

  // Diff loader for tabs
  const loadTabDiff = useCallback(
    async (tab: OpenDiffTab) => {
      if (diffCache[tab.id]) return;
      setDiffLoadingMap((prev) => ({ ...prev, [tab.id]: true }));
      try {
        if (tab.type === "commit" && tab.commitOid) {
          const delta = await invoke<DiffDelta>("get_commit_file_diff_cmd", {
            path: repoPath,
            commitOid: tab.commitOid,
            relativePath: tab.path,
          });
          setDiffCache((prev) => ({ ...prev, [tab.id]: delta }));
        } else {
          const delta = await invoke<DiffDelta>("get_diff_cmd", {
            path: repoPath,
            relativePath: tab.path,
            staged: Boolean(tab.staged),
          });
          setDiffCache((prev) => ({ ...prev, [tab.id]: delta }));
        }
      } catch (err: unknown) {
        setDiffCache((prev) => ({
          ...prev,
          [tab.id]: {
            path: tab.path,
            patch: `Error al calcular diff: ${typeof err === "string" ? err : JSON.stringify(err)}`,
            lines_added: 0,
            lines_deleted: 0,
          },
        }));
      } finally {
        setDiffLoadingMap((prev) => ({ ...prev, [tab.id]: false }));
      }
    },
    [diffCache, repoPath]
  );

  const openFileTab = useCallback(
    (
      file: { path: string; staged?: boolean; commitOid?: string; type: "staging" | "commit" },
      autoSwitch: boolean = true
    ) => {
      const tabId =
        file.type === "commit" && file.commitOid
          ? `diff-commit-${file.commitOid}-${file.path}`
          : `diff-staging-${file.staged ? "staged" : "unstaged"}-${file.path}`;

      const existing = openDiffTabs.find((t) => t.id === tabId);
      if (existing) {
        if (autoSwitch) {
          setActiveCenterTab(tabId);
        }
        return;
      }

      if (openDiffTabs.length >= 5) {
        setTabLimitWarning("Límite de 5 pestañas alcanzado. Cierra pestañas antes de abrir más.");
        if (tabWarningTimeoutRef.current) clearTimeout(tabWarningTimeoutRef.current);
        tabWarningTimeoutRef.current = setTimeout(() => {
          setTabLimitWarning(null);
        }, 4000);
        return;
      }

      const fileName = file.path.split("/").pop() || file.path;
      const newTab: OpenDiffTab = {
        id: tabId,
        path: file.path,
        name: fileName,
        type: file.type,
        staged: file.staged,
        commitOid: file.commitOid,
      };

      setOpenDiffTabs((prev) => [...prev, newTab]);
      loadTabDiff(newTab);

      if (autoSwitch) {
        setActiveCenterTab(tabId);
      }
    },
    [openDiffTabs, loadTabDiff]
  );

  const closeDiffTab = useCallback(
    (tabId: string) => {
      setOpenDiffTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeCenterTab === tabId) {
        setActiveCenterTab("graph");
      }
      setTabLimitWarning(null);
    },
    [activeCenterTab]
  );

  const refreshPrCount = useCallback(async () => {
    if (!summary?.remote_url || !githubUser) {
      setOpenPrCount(0);
      return;
    }
    let clean = summary.remote_url.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "");
    } else if (clean.startsWith("https://github.com/")) {
      clean = clean.replace("https://github.com/", "");
    }
    clean = clean.replace(/\.git$/, "");
    if (!clean || clean.includes("desconocido")) {
      setOpenPrCount(0);
      return;
    }

    try {
      const prs = await invoke<PullRequestItem[]>("list_pull_requests_cmd", {
        ownerRepo: clean,
        state: "open",
      });
      setOpenPrCount(prs.length);
    } catch {
      setOpenPrCount(0);
    }
  }, [summary?.remote_url, githubUser]);

  useEffect(() => {
    refreshPrCount();
  }, [refreshPrCount]);

  // Comprehensive Refresh for this workspace
  const handleRefreshAll = useCallback(async () => {
    if (!repoPath || isSyncingAll) return;
    setIsSyncingAll(true);
    try {
      await Promise.allSettled([
        refreshRepo(),
        refreshStatuses(),
        refreshCommits(),
        checkConflicts(),
        refreshBranches(),
        refreshTags(),
        refreshPrCount(),
      ]);

      // Refresh diffs of open tabs
      await Promise.allSettled(
        openDiffTabs.map(async (tab) => {
          try {
            if (tab.type === "commit" && tab.commitOid) {
              const delta = await invoke<DiffDelta>("get_commit_file_diff_cmd", {
                path: repoPath,
                commitOid: tab.commitOid,
                relativePath: tab.path,
              });
              setDiffCache((prev) => ({ ...prev, [tab.id]: delta }));
            } else {
              const delta = await invoke<DiffDelta>("get_diff_cmd", {
                path: repoPath,
                relativePath: tab.path,
                staged: Boolean(tab.staged),
              });
              setDiffCache((prev) => ({ ...prev, [tab.id]: delta }));
            }
          } catch {
            // Ignore tab diff error
          }
        })
      );
    } finally {
      setTimeout(() => {
        setIsSyncingAll(false);
      }, 350);
    }
  }, [
    repoPath,
    isSyncingAll,
    refreshRepo,
    refreshStatuses,
    refreshCommits,
    checkConflicts,
    refreshBranches,
    refreshTags,
    refreshPrCount,
    openDiffTabs,
  ]);

  // File watcher registration for this workspace
  useEffect(() => {
    if (repoPath) {
      invoke("watch_repo_path_cmd", { path: repoPath }).catch((err) => {
        console.warn(`Error iniciando watcher para ${repoPath}:`, err);
      });
    }
  }, [repoPath]);

  // Isolated repo-fs-changed listener matching this workspace's path
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("repo-fs-changed", (event) => {
      if (event.payload && event.payload !== repoPath) {
        return; // Ignore events from other repositories
      }
      refreshStatuses();
      checkConflicts();
    }).then((unsub) => {
      unlisten = unsub;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [repoPath, refreshStatuses, checkConflicts]);

  // Window focus synchronization
  useEffect(() => {
    const handleWindowFocus = () => {
      if (isActive) {
        refreshStatuses();
        checkConflicts();
      }
    };
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isActive, refreshStatuses, checkConflicts]);

  // Discard changes dialog state
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<{
    type: "single" | "all";
    filePath?: string;
    totalCount?: number;
  } | null>(null);

  const handleRequestDiscardFile = (filePath: string) => {
    setDiscardTarget({ type: "single", filePath });
    setDiscardModalOpen(true);
  };

  const handleRequestDiscardAll = () => {
    setDiscardTarget({ type: "all", totalCount: unstagedFiles.length });
    setDiscardModalOpen(true);
  };

  const handleConfirmDiscard = async () => {
    if (!discardTarget) return;
    if (discardTarget.type === "single" && discardTarget.filePath) {
      await discardFile(discardTarget.filePath);
    } else if (discardTarget.type === "all") {
      await discardAll();
    }
    handleRefreshAll();
  };

  const handleReleaseSuccess = useCallback((_version: string) => {
    setIsReleaseTriggered(true);
    handleRefreshAll();
    const delays = [1000, 2500, 4500, 7000, 10000, 15000, 20000];
    delays.forEach((delay) => {
      setTimeout(() => {
        fetchRuns().catch(() => {});
      }, delay);
    });
  }, [handleRefreshAll, fetchRuns]);

  // Toolbar Operations Hook
  const handleToolbarOperationSuccess = useCallback(
    (opName?: string) => {
      if (opName === "Fetch") {
        refreshBranches();
        refreshCommits();
        return;
      }
      if (
        opName === "Nueva Rama" ||
        opName?.startsWith("Checkout") ||
        opName?.startsWith("Renombrar") ||
        opName?.startsWith("Eliminar")
      ) {
        // Immediate branch & working tree sync
        refreshBranches();
        refreshRepo();
        refreshStatuses();
        refreshCommits();
        checkConflicts();
        return;
      }
      if (opName === "Stash" || opName === "Pop Stash") {
        refreshStatuses();
        refreshRepo();
        return;
      }
      refreshRepo();
      refreshStatuses();
      refreshCommits();
      refreshBranches();
      checkConflicts();
    },
    [refreshBranches, refreshCommits, refreshRepo, refreshStatuses, checkConflicts]
  );

  const {
    operating: toolbarOperating,
    activeOp: toolbarActiveOp,
    message: toolbarMessage,
    error: toolbarError,
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
    clearNotification: clearToolbarNotification,
  } = useGitToolbar(repoPath, handleToolbarOperationSuccess);

  const handlePushTag = async (tagName: string) => {
    try {
      await pushTag(tagName);
      await refreshTags();
    } catch (err: unknown) {
      console.error("Error subiendo etiqueta:", err);
    }
  };

  // Branch Checkout & Ahead/Behind Detection
  // Strict priority to b.is_head over stale current_branch string
  const currentBranchName = summary?.current_branch || "main";
  const currentBranchInfo = useMemo(() => {
    return (
      branches.local.find((b) => b.is_head) ||
      branches.local.find((b) => b.name === currentBranchName) ||
      null
    );
  }, [branches.local, currentBranchName]);

  const aheadCount = currentBranchInfo?.ahead ?? 0;
  const behindCount = currentBranchInfo?.behind ?? 0;
  const hasUpstream = Boolean(currentBranchInfo?.upstream_name);
  const hasUncommittedChanges = stagedFiles.length > 0 || unstagedFiles.length > 0;

  // Branch Drag & Drop Merge/Pull/Push
  const [mergeModal, setMergeModal] = useState<{
    isOpen: boolean;
    sourceBranch: string;
    targetBranch: string;
    sourceIsRemote: boolean;
    targetIsRemote: boolean;
  }>({
    isOpen: false,
    sourceBranch: "",
    targetBranch: "",
    sourceIsRemote: false,
    targetIsRemote: false,
  });

  const handleDropBranch = (
    sourceBranch: string,
    targetBranch: string,
    sourceIsRemote: boolean = false,
    targetIsRemote: boolean = false
  ) => {
    if (sourceIsRemote && targetIsRemote) {
      const cleanSource = sourceBranch.replace(/^[^\/]+\//, "");
      const cleanTarget = targetBranch.replace(/^[^\/]+\//, "");
      handleOpenPullRequest(cleanSource, cleanTarget);
      return;
    }
    setMergeModal({
      isOpen: true,
      sourceBranch,
      targetBranch,
      sourceIsRemote,
      targetIsRemote,
    });
  };

  // Branch and Commit Context Menus
  const [branchContextMenuState, setBranchContextMenuState] = useState<BranchContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    branchName: "",
    isHead: false,
    isRemote: false,
  });

  const [commitContextMenuState, setCommitContextMenuState] = useState<CommitContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    commit: null,
  });

  const [fileContextMenuState, setFileContextMenuState] = useState<FileContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    relativePath: "",
    repoPath: "",
    source: "tab",
  });

  const [restoreFileTarget, setRestoreFileTarget] = useState<{
    commitOid: string;
    relativePath: string;
  } | null>(null);

  const handleOpenBranchContextMenu = (
    x: number,
    y: number,
    branchName: string,
    isHead: boolean,
    isRemote: boolean,
    commitOid?: string
  ) => {
    setBranchContextMenuState({
      isOpen: true,
      x,
      y,
      branchName,
      isHead,
      isRemote,
      commitOid,
    });
  };

  const handleOpenCommitContextMenu = (x: number, y: number, commit: CommitInfo) => {
    setCommitContextMenuState({
      isOpen: true,
      x,
      y,
      commit,
    });
  };

  const handleOpenFileContextMenu = (
    e: React.MouseEvent,
    relativePath: string,
    source: FileContextMenuState["source"],
    extra?: { tabId?: string; commitOid?: string; isConflicted?: boolean; isUntracked?: boolean }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setFileContextMenuState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      relativePath,
      repoPath,
      source,
      tabId: extra?.tabId,
      commitOid: extra?.commitOid,
      isConflicted: extra?.isConflicted,
      isUntracked: extra?.isUntracked,
    });
  };

  const handleCloseOtherDiffTabs = (keepTabId: string) => {
    setOpenDiffTabs((prev) => prev.filter((t) => t.id === keepTabId));
    setActiveCenterTab(keepTabId);
  };

  const handleCloseDiffTabsToRight = (tabId: string) => {
    setOpenDiffTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const filtered = prev.slice(0, idx + 1);
      if (!filtered.some((t) => t.id === activeCenterTab)) {
        setActiveCenterTab(tabId);
      }
      return filtered;
    });
  };

  const handleAddToGitignore = async (pattern: string) => {
    if (!repoPath) return;
    try {
      await invoke("add_to_gitignore_cmd", {
        repoPath,
        pattern,
      });
      await refreshStatuses();
    } catch (err) {
      console.error("Error al agregar a .gitignore:", err);
    }
  };

  const handleRequestRestoreCommitFile = (commitOid: string, relativePath: string) => {
    setRestoreFileTarget({ commitOid, relativePath });
  };

  const handleConfirmRestoreCommitFile = async () => {
    if (!repoPath || !restoreFileTarget) return;
    try {
      await invoke("restore_commit_file_cmd", {
        repoPath,
        commitOid: restoreFileTarget.commitOid,
        relativePath: restoreFileTarget.relativePath,
      });
      await refreshStatuses();
      openFileTab({ path: restoreFileTarget.relativePath, staged: false, type: "staging" });
    } catch (err) {
      console.error("Error al restaurar archivo del commit:", err);
    } finally {
      setRestoreFileTarget(null);
    }
  };

  const handleFilterHistory = (path: string) => {
    setActiveCenterTab("graph");
    setGraphSearchQuery(path);
  };

  const [draggedDiffIndex, setDraggedDiffIndex] = useState<number | null>(null);
  const [dragOverDiffIndex, setDragOverDiffIndex] = useState<number | null>(null);

  const handleReorderDiffTabs = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setOpenDiffTabs((prev) => {
      const next = [...prev];
      if (fromIndex < 0 || fromIndex >= next.length || toIndex < 0 || toIndex >= next.length) {
        return prev;
      }
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleOpenUndoCommit = (commit?: CommitInfo | null) => {
    const target =
      commit ||
      graphNodes.find((n) => n.commit.oid === summary?.head_commit_oid)?.commit ||
      graphNodes[0]?.commit ||
      null;
    if (target) {
      setCommitToUndo(target);
      setUndoCommitModalOpen(true);
    }
  };

  const handleConfirmUndoCommit = async (keepStaged: boolean) => {
    try {
      await invoke("undo_commit_cmd", {
        path: repoPath,
        keepStaged,
      });
      handleRefreshAll();
      setSelectedCommit(null);
      setIsWipSelected(true);
      setActiveCenterTab("graph");
    } catch (err: unknown) {
      console.error("Error al deshacer commit:", err);
      throw err;
    }
  };

  // Pull Request Modal
  const [pullRequestModalOpen, setPullRequestModalOpen] = useState(false);
  const [prInitialHead, setPrInitialHead] = useState<string | undefined>(undefined);
  const [prInitialBase, setPrInitialBase] = useState<string | undefined>(undefined);

  const handleOpenPullRequest = (headBranch?: string, baseBranch?: string) => {
    if (headBranch) {
      setPrInitialHead(headBranch);
    }
    if (baseBranch) {
      setPrInitialBase(baseBranch);
    }
    setPullRequestModalOpen(true);
  };

  const handleSelectWip = () => {
    setSelectedCommit(null);
    setIsWipSelected((prev) => !prev);
    const first = stagedFiles[0] || unstagedFiles[0];
    if (first) {
      openFileTab(
        {
          path: first.path,
          staged: first.staged_status !== null && first.staged_status !== undefined,
          type: "staging",
        },
        false
      );
    }
  };

  const handleSelectCommit = (commit: CommitInfo) => {
    setIsWipSelected(false);
    if (selectedCommit?.oid === commit.oid) {
      setSelectedCommit(null);
    } else {
      setSelectedCommit(commit);
    }
  };

  const handleNavigateToCommit = (targetOid: string) => {
    const node = graphNodes.find((n) => n.commit.oid === targetOid);
    if (node) {
      setSelectedCommit(node.commit);
    }
    setTimeout(() => {
      const el = document.getElementById(`commit-row-${targetOid}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  const handleSelectBranchCommit = (_branchName: string, targetOid: string) => {
    handleNavigateToCommit(targetOid);
  };

  // Active diff tab resolution
  const currentActiveTab = openDiffTabs.find((t) => t.id === activeCenterTab) || null;
  const currentDiff = currentActiveTab ? diffCache[currentActiveTab.id] || null : null;
  const currentDiffLoading = currentActiveTab ? Boolean(diffLoadingMap[currentActiveTab.id]) : false;

  const splitActiveTab =
    currentActiveTab || (openDiffTabs.length > 0 ? openDiffTabs[openDiffTabs.length - 1] : null);
  const splitDiff = splitActiveTab ? diffCache[splitActiveTab.id] || null : null;
  const splitDiffLoading = splitActiveTab ? Boolean(diffLoadingMap[splitActiveTab.id]) : false;

  useEffect(() => {
    if (openDiffTabs.length === 0 && centerViewMode === "split") {
      setCenterViewMode("full");
    }
  }, [openDiffTabs.length, centerViewMode]);

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden select-none bg-[#0d1117] text-[#c9d1d9]">
      {/* Top Project Header & GitKraken Action Toolbar */}
      <header className="h-14 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          {/* Logo & Application Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={logoImg}
                alt="GitManager"
                className="w-8 h-8 rounded-lg shadow-md ring-1 ring-white/10"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">GitManager</span>
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold font-mono tracking-widest">
                  PRO
                </span>
                <span className="text-[10px] text-[#8b949e] font-mono font-medium">
                  v{__APP_VERSION__}
                </span>
              </div>
              <span className="text-[11px] text-[#8b949e] hidden sm:inline leading-none font-sans">
                Cliente Git & GitHub nativo
              </span>
            </div>

            <span className="text-[#484f58] font-thin mx-1">/</span>

            {/* Current Repository & Branch Badges */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8b949e] text-[11px] font-sans font-medium">Repositorio:</span>
              <span
                className="font-mono text-xs px-2 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-blue-500/30 font-semibold truncate max-w-[150px]"
                title={`Repositorio: ${tabName} (${repoPath})`}
              >
                {tabName}
              </span>
            </div>

            {summary && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-[#8b949e]">
                  <span className="text-[#8b949e] text-[11px] font-sans font-medium">Rama:</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded font-mono text-[11px] font-bold">
                    * {currentBranchInfo?.name || summary.current_branch || "HEAD"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Git Operations Action Toolbar */}
        <GitToolbar
          operating={toolbarOperating}
          activeOp={toolbarActiveOp}
          message={toolbarMessage}
          error={toolbarError}
          isTerminalOpen={isTerminalOpen}
          aheadCount={aheadCount}
          behindCount={behindCount}
          openPrCount={openPrCount}
          activeRunsCount={effectiveActiveRunsCount}
          actionsStatus={effectiveActionsStatus}
          isGitManagerRepo={isGitManagerRepo}
          hasUpstream={hasUpstream}
          hasUncommittedChanges={hasUncommittedChanges}
          onFetch={fetchRemote}
          onPull={pullRemote}
          onPush={pushRemote}
          onOpenCreateBranch={() => setBranchModalOpen(true)}
          onStash={stashChanges}
          onPopStash={popStash}
          onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
          onOpenPullRequests={() => setPrHubOpen(true)}
          onOpenActions={() => setActionsHubOpen(true)}
          onOpenReleaseWizard={() => setReleaseWizardOpen(true)}
          onClearNotification={clearToolbarNotification}
        />

        {/* Right Section: Single Unified Refresh */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={isSyncingAll}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? "animate-spin text-blue-400" : ""}`} />}
            onClick={handleRefreshAll}
            title="Sincronizar todo el repositorio"
            className="h-8 text-xs font-medium"
          >
            Sincronizar
          </Button>
        </div>
      </header>

      {/* Main Studio Layout with Resizable Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Collapsed 36px rail OR Expanded Aside */}
        {leftCollapsed ? (
          <div
            onClick={handleToggleLeftPanel}
            className="w-9 h-full bg-[#0d1117] border-r border-[#30363d] flex flex-col items-center justify-center shrink-0 cursor-pointer select-none hover:bg-[#161b22] transition-colors group z-10"
            title="Expandir panel izquierdo (Ramas y Etiquetas)"
          >
            <span
              className="text-[11px] font-semibold text-[#8b949e] group-hover:text-[#c9d1d9] tracking-wider uppercase whitespace-nowrap select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Ramas & Etiquetas
            </span>
          </div>
        ) : (
          <>
            <aside
              style={{ width: leftWidth }}
              className="bg-[#0d1117] flex flex-col p-3 gap-2.5 shrink-0 overflow-hidden select-none"
            >
              {/* Header with Minimize Button */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]/60 shrink-0">
                <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                  <span>Explorador Git</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleLeftPanel}
                  className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
                  title="Minimizar panel izquierdo"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Accordions */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {/* 1. Local Branches Accordion */}
                <AccordionSection
                  title="Ramas Locales"
                  count={branches.local.length}
                  icon={<GitBranch className="w-3.5 h-3.5 text-blue-400" />}
                  defaultOpen={true}
                >
                  <BranchTreeView
                    key={`local-${repoPath}`}
                    branches={branches.local}
                    currentBranch={currentBranchInfo?.name || currentBranchName}
                    onSelectBranch={handleSelectBranchCommit}
                    onContextMenu={handleOpenBranchContextMenu}
                    onDropBranch={handleDropBranch}
                  />
                </AccordionSection>

                {/* 2. Remote Branches Accordion */}
                <AccordionSection
                  title="Ramas Remotas"
                  count={branches.remote.length}
                  icon={<Cloud className="w-3.5 h-3.5 text-purple-400" />}
                  defaultOpen={true}
                >
                  <BranchTreeView
                    key={`remote-${repoPath}`}
                    branches={branches.remote}
                    isRemote={true}
                    onSelectBranch={handleSelectBranchCommit}
                    onContextMenu={handleOpenBranchContextMenu}
                    onDropBranch={handleDropBranch}
                  />
                </AccordionSection>

                {/* 3. Tags Accordion */}
                <AccordionSection
                  title="Etiquetas (Tags)"
                  count={tags.length}
                  icon={<Tag className="w-3.5 h-3.5 text-emerald-400" />}
                  defaultOpen={false}
                >
                  <TagListView
                    tags={tags}
                    onSelectTag={(targetCommitId) => {
                      if (targetCommitId) {
                        handleNavigateToCommit(targetCommitId);
                      }
                    }}
                    onPushTag={handlePushTag}
                    onOpenTagDetails={(tag) => {
                      setSelectedTagForModal(tag);
                      setTagModalInitialDelete(false);
                      setTagDetailsModalOpen(true);
                    }}
                    onOpenDeleteTag={(tag) => {
                      setSelectedTagForModal(tag);
                      setTagModalInitialDelete(true);
                      setTagDetailsModalOpen(true);
                    }}
                  />
                </AccordionSection>
              </div>
            </aside>

            {/* Resizable Left Splitter */}
            <Splitter
              direction="vertical"
              title="Arrastra para cambiar el ancho de la barra izquierda"
              onDrag={(e) => {
                const w = Math.min(Math.max(e.clientX, 180), 500);
                setLeftWidth(w);
                localStorage.setItem("gitmanager_panel_left_width", w.toString());
              }}
            />
          </>
        )}

        {/* Center Canvas: Commit Graph & Diff Viewers */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117] overflow-hidden relative">
          {/* Top Multi-tab diff header & view mode switcher */}
          <div className="h-9 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between px-2 shrink-0 select-none">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
              <button
                onClick={() => setActiveCenterTab("graph")}
                className={`flex items-center gap-1.5 px-3 h-7 rounded text-xs transition-colors cursor-pointer shrink-0 ${
                  activeCenterTab === "graph"
                    ? "bg-[#1f6feb]/20 text-white font-medium border border-blue-500/40"
                    : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                <span>Grafo de Commits</span>
              </button>

              {openDiffTabs.map((tab, index) => (
                <div
                  key={tab.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/diff-tab-index", index.toString());
                    setDraggedDiffIndex(index);
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("application/diff-tab-index")) {
                      e.preventDefault();
                      setDragOverDiffIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverDiffIndex === index) setDragOverDiffIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedDiffIndex !== null && draggedDiffIndex !== index) {
                      handleReorderDiffTabs(draggedDiffIndex, index);
                    }
                    setDraggedDiffIndex(null);
                    setDragOverDiffIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedDiffIndex(null);
                    setDragOverDiffIndex(null);
                  }}
                  onClick={() => setActiveCenterTab(tab.id)}
                  onContextMenu={(e) =>
                    handleOpenFileContextMenu(e, tab.path, "tab", {
                      tabId: tab.id,
                      commitOid: tab.commitOid,
                    })
                  }
                  className={`flex items-center gap-1.5 px-2.5 h-7 rounded text-xs transition-colors cursor-pointer shrink-0 border ${
                    activeCenterTab === tab.id
                      ? "bg-[#21262d] text-white border-[#30363d] font-medium"
                      : "text-[#8b949e] border-transparent hover:text-[#c9d1d9] hover:bg-[#161b22]"
                  }`}
                  title={`${tab.path} (Clic derecho para opciones)`}
                >
                  <FileText className="w-3 h-3 text-[#8b949e]" />
                  <span className="truncate max-w-[120px] font-mono text-[11px]">{tab.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDiffTab(tab.id);
                    }}
                    className="p-0.5 rounded text-[#8b949e] hover:text-white hover:bg-[#30363d]"
                    title="Cerrar pestaña"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Split / Full view switcher & Graph toolbar controls */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <GraphToolbarControls
                searchQuery={graphSearchQuery}
                onSearchChange={setGraphSearchQuery}
                matchesCount={graphNodes.length}
                totalCount={graphNodes.length}
                visibleColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
                onResetColumnWidths={handleResetColumnWidths}
                viewMode={graphViewMode}
                onChangeViewMode={handleChangeViewMode}
                showCommitBody={showCommitBody}
                onToggleShowCommitBody={handleToggleShowCommitBody}
              />
            </div>
          </div>

          {/* Tab Limit Warning */}
          {tabLimitWarning && (
            <div className="bg-amber-950/80 border-b border-amber-600/40 text-amber-200 px-3 py-1.5 text-xs flex items-center justify-between shrink-0 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{tabLimitWarning}</span>
              </div>
              <button
                onClick={() => setTabLimitWarning(null)}
                className="text-amber-400 hover:text-amber-100 text-xs px-1 font-semibold"
              >
                Entendido
              </button>
            </div>
          )}

          {/* Center Body (Full vs Split) */}
          {centerViewMode === "full" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeCenterTab !== "graph" && currentActiveTab ? (
                <DiffViewer
                  diff={currentDiff}
                  loading={currentDiffLoading}
                  repoPath={repoPath}
                  commitOid={currentActiveTab.commitOid}
                  staged={currentActiveTab.staged}
                  onClose={() => closeDiffTab(currentActiveTab.id)}
                  onContextMenu={(e, path) => handleOpenFileContextMenu(e, path, "diff_header")}
                />
              ) : (
                <CommitGraph
                  key={repoPath}
                  nodes={graphNodes}
                  selectedCommit={selectedCommit}
                  loading={commitsLoading}
                  branches={branches}
                  tags={tags}
                  showCommitBody={showCommitBody}
                  visibleColumns={visibleColumns}
                  viewMode={graphViewMode}
                  searchQuery={graphSearchQuery}
                  githubAvatarUrl={githubUser?.avatar_url}
                  githubLogin={githubUser?.login}
                  wipChangesCount={{ staged: stagedFiles.length, unstaged: unstagedFiles.length }}
                  isWipSelected={isWipSelected}
                  onSelectWip={handleSelectWip}
                  onSelectCommit={handleSelectCommit}
                  onCommitContextMenu={handleOpenCommitContextMenu}
                  onBranchContextMenu={handleOpenBranchContextMenu}
                  onDropBranch={handleDropBranch}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden min-h-[120px]">
                <CommitGraph
                  key={repoPath}
                  nodes={graphNodes}
                  selectedCommit={selectedCommit}
                  loading={commitsLoading}
                  branches={branches}
                  tags={tags}
                  showCommitBody={showCommitBody}
                  visibleColumns={visibleColumns}
                  viewMode={graphViewMode}
                  searchQuery={graphSearchQuery}
                  githubAvatarUrl={githubUser?.avatar_url}
                  githubLogin={githubUser?.login}
                  wipChangesCount={{ staged: stagedFiles.length, unstaged: unstagedFiles.length }}
                  isWipSelected={isWipSelected}
                  onSelectWip={handleSelectWip}
                  onSelectCommit={handleSelectCommit}
                  onCommitContextMenu={handleOpenCommitContextMenu}
                  onBranchContextMenu={handleOpenBranchContextMenu}
                  onDropBranch={handleDropBranch}
                />
              </div>

              <Splitter
                direction="horizontal"
                title="Arrastra para cambiar la altura del visor de diferencias"
                onDrag={(e) =>
                  setDiffHeight(
                    Math.min(
                      Math.max(window.innerHeight - e.clientY, 140),
                      window.innerHeight - 250
                    )
                  )
                }
              />

              <div style={{ height: diffHeight }} className="flex flex-col overflow-hidden">
                <DiffViewer
                  diff={splitDiff}
                  loading={splitDiffLoading}
                  repoPath={repoPath}
                  commitOid={splitActiveTab?.commitOid}
                  staged={splitActiveTab?.staged}
                  onClose={() => {
                    if (splitActiveTab) {
                      closeDiffTab(splitActiveTab.id);
                    }
                  }}
                  onContextMenu={(e, path) => handleOpenFileContextMenu(e, path, "diff_header")}
                />
              </div>
            </div>
          )}

          {/* Embedded Linux Terminal Panel */}
          <EmbeddedTerminal
            repoPath={repoPath}
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
          />
        </main>

        {/* Right Sidebar: Collapsed 36px rail OR Resizable Staging/Commit Details */}
        {rightCollapsed ? (
          <div
            onClick={handleToggleRightPanel}
            className="w-9 h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col items-center justify-center shrink-0 cursor-pointer select-none hover:bg-[#161b22] transition-colors group z-10"
            title="Expandir panel derecho (Área de Cambios)"
          >
            <span
              className="text-[11px] font-semibold text-[#8b949e] group-hover:text-[#c9d1d9] tracking-wider uppercase whitespace-nowrap select-none"
              style={{ writingMode: "vertical-rl" }}
            >
              {selectedCommit ? "Detalles del Commit" : "Área de Cambios (WIP)"}
            </span>
          </div>
        ) : (
          <>
            <Splitter
              direction="vertical"
              title="Arrastra para cambiar el ancho de la barra derecha"
              onDrag={(e) => {
                const w = Math.min(Math.max(window.innerWidth - e.clientX, 280), 650);
                setRightWidth(w);
                localStorage.setItem("gitmanager_panel_right_width", w.toString());
              }}
            />

            <div
              style={{ width: rightWidth }}
              className="bg-[#0d1117] flex flex-col shrink-0 overflow-hidden select-none"
            >
              {selectedCommit ? (
                <CommitDetailsPanel
                  commit={selectedCommit}
                  files={commitFiles}
                  loading={commitFilesLoading}
                  selectedFilePath={currentActiveTab?.path || null}
                  isHead={selectedCommit.oid === summary?.head_commit_oid}
                  githubAvatarUrl={githubUser?.avatar_url}
                  githubLogin={githubUser?.login}
                  onSelectFile={(path) =>
                    openFileTab(
                      { path, commitOid: selectedCommit.oid, type: "commit" },
                      true
                    )
                  }
                  onUndoCommit={() => handleOpenUndoCommit(selectedCommit)}
                  onToggleCollapse={handleToggleRightPanel}
                  onFileContextMenu={(e, path, commitOid) =>
                    handleOpenFileContextMenu(e, path, "commit_file", { commitOid })
                  }
                  onClose={() => {
                    setSelectedCommit(null);
                    setIsWipSelected(true);
                  }}
                />
              ) : (
                <StagingArea
                  key={repoPath}
                  repoPath={repoPath}
                  stagedFiles={stagedFiles}
                  unstagedFiles={unstagedFiles}
                  conflictedFiles={[]}
                  selectedFile={
                    currentActiveTab?.type === "staging"
                      ? { path: currentActiveTab.path, staged: Boolean(currentActiveTab.staged) }
                      : null
                  }
                  currentBranch={currentBranchInfo?.name || currentBranchName}
                  loading={stagingLoading}
                  aiGenerating={aiGenerating}
                  onToggleCollapse={handleToggleRightPanel}
                  onRefresh={() => {
                    refreshStatuses();
                    checkConflicts();
                  }}
                  onStageFile={stageFile}
                  onUnstageFile={unstageFile}
                  onStageAll={stageAll}
                  onUnstageAll={unstageAll}
                  onDiscardFile={handleRequestDiscardFile}
                  onDiscardAll={handleRequestDiscardAll}
                  onSelectFile={(path, staged) => {
                    if (path) {
                      openFileTab({ path, staged, type: "staging" }, true);
                    } else {
                      setActiveCenterTab("graph");
                    }
                  }}
                  onCommit={async (message, tag, tagMessage) => {
                    const newOid = await commitChanges(message);
                    if (newOid && tag && tag.trim()) {
                      try {
                        await createTag(tag.trim(), newOid, tagMessage?.trim() || undefined);
                        await refreshTags();
                      } catch (err: unknown) {
                        console.error("Error creando tag en commit:", err);
                      }
                    }
                  }}
                  onGenerateAiCommit={handleGenerateAiCommit}
                  onOpenAiConfig={() => onOpenSettings("ai")}
                  onOpenConflictResolver={(filePath) => openConflictModal(filePath)}
                  onFileContextMenu={(e, path, isStaged, isConflicted, isUntracked) => {
                    handleOpenFileContextMenu(
                      e,
                      path,
                      isStaged ? "wip_staged" : "wip_unstaged",
                      {
                        isConflicted,
                        isUntracked,
                      }
                    );
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Operational Git Modals for this specific workspace */}
      <CreateBranchModal
        isOpen={branchModalOpen}
        branches={branches}
        currentBranch={currentBranchInfo?.name || currentBranchName}
        onClose={() => setBranchModalOpen(false)}
        onCreate={(branchName, baseBranch) => {
          createNewBranch(branchName, baseBranch);
        }}
      />

      <BranchMergeModal
        isOpen={mergeModal.isOpen}
        sourceBranch={mergeModal.sourceBranch}
        targetBranch={mergeModal.targetBranch}
        sourceIsRemote={mergeModal.sourceIsRemote}
        targetIsRemote={mergeModal.targetIsRemote}
        onClose={() => setMergeModal((prev) => ({ ...prev, isOpen: false }))}
        onMerge={(source) => mergeBranch(source, mergeModal.targetBranch)}
        onRebase={(source) => rebaseBranch(source)}
        onPull={() => pullRemote()}
        onPush={() => pushRemote()}
      />

      <BranchContextMenu
        state={branchContextMenuState}
        currentBranch={currentBranchInfo?.name || currentBranchName}
        remoteUrl={summary?.remote_url}
        hasUncommittedChanges={hasUncommittedChanges}
        onClose={() => setBranchContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCheckout={(bName) => checkoutBranch(bName)}
        onMerge={(bName) => mergeBranch(bName, currentBranchInfo?.name || currentBranchName)}
        onRebase={(bName) => rebaseBranch(bName)}
        onRename={(oldN, newN) => renameBranch(oldN, newN)}
        onDelete={(bName) => deleteBranch(bName)}
        onCreateBranchHere={(_commitOid, _base) => setBranchModalOpen(true)}
        onCreateTagHere={(commitOid) => {
          setTargetCommitForTag({ oid: commitOid });
          setCreateTagModalOpen(true);
        }}
        onStartPullRequest={(bName) => handleOpenPullRequest(bName)}
        onPull={() => pullRemote()}
        onPush={() => pushRemote()}
      />

      <CommitContextMenu
        state={commitContextMenuState}
        remoteUrl={summary?.remote_url}
        isHead={commitContextMenuState.commit?.oid === summary?.head_commit_oid}
        onClose={() => setCommitContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCreateBranch={(_commit) => {
          setBranchModalOpen(true);
        }}
        onCreateTag={(commit) => {
          setTargetCommitForTag({ oid: commit.oid, summary: commit.summary });
          setCreateTagModalOpen(true);
        }}
        onUndoCommit={handleOpenUndoCommit}
      />

      <FileContextMenu
        key={`${fileContextMenuState.source}-${fileContextMenuState.relativePath}-${fileContextMenuState.x}-${fileContextMenuState.y}`}
        state={fileContextMenuState}
        onClose={() => setFileContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCloseTab={closeDiffTab}
        onCloseOtherTabs={handleCloseOtherDiffTabs}
        onCloseTabsToRight={handleCloseDiffTabsToRight}
        onFilterHistory={handleFilterHistory}
        onStageFile={stageFile}
        onUnstageFile={unstageFile}
        onDiscardFile={handleRequestDiscardFile}
        onAddToGitignore={handleAddToGitignore}
        onResolveConflict={(path) => openConflictModal(path)}
        onRestoreCommitFile={handleRequestRestoreCommitFile}
      />

      {/* Restore Commit File Confirmation Modal */}
      {restoreFileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">¿Restaurar archivo de esta versión?</h3>
                <p className="text-xs text-[#8b949e]">Acción destructiva sobre el espacio de trabajo local</p>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs space-y-1.5 font-mono">
              <div className="text-white truncate">
                <span className="text-[#8b949e]">Archivo: </span>
                <span className="text-amber-300 font-bold">{restoreFileTarget.relativePath}</span>
              </div>
              <div className="text-[#8b949e] text-[11px]">
                Versión origen commit: <span className="text-purple-300">{restoreFileTarget.commitOid.slice(0, 8)}</span>
              </div>
            </div>

            <p className="text-xs text-[#8b949e] leading-relaxed">
              El contenido de este archivo en tu directorio de trabajo será sobrescrito con el contenido exacto de este commit.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
              <Button size="sm" variant="secondary" onClick={() => setRestoreFileTarget(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleConfirmRestoreCommitFile}
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
              >
                Sobrescribir y Restaurar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hub Modals */}
      <PullRequestHubModal
        isOpen={prHubOpen}
        repoPath={repoPath}
        remoteUrl={summary?.remote_url}
        currentUser={githubUser}
        initialPrNumber={hubSelectedPrNumber}
        onClose={() => {
          setPrHubOpen(false);
          setHubSelectedPrNumber(null);
          refreshPrCount();
        }}
      />

      <CreatePullRequestModal
        isOpen={pullRequestModalOpen}
        repoPath={repoPath}
        remoteUrl={summary?.remote_url}
        branches={branches}
        initialHeadBranch={prInitialHead}
        initialBaseBranch={prInitialBase}
        onOpenPrHub={(prNumber) => {
          setHubSelectedPrNumber(prNumber || null);
          setPrHubOpen(true);
        }}
        onClose={() => {
          setPullRequestModalOpen(false);
          refreshPrCount();
        }}
      />

      <ActionsHubModal
        isOpen={actionsHubOpen}
        remoteUrl={summary?.remote_url}
        onClose={() => setActionsHubOpen(false)}
      />

      <ReleaseWizardModal
        isOpen={releaseWizardOpen}
        repoPath={repoPath}
        currentBranch={currentBranchInfo?.name || summary?.current_branch}
        openPrCount={openPrCount}
        activeRunsCount={effectiveActiveRunsCount}
        hasUncommittedChanges={hasUncommittedChanges}
        uncommittedChangesCount={stagedFiles.length + unstagedFiles.length}
        onClose={() => setReleaseWizardOpen(false)}
        onReleaseStart={() => setIsReleaseTriggered(true)}
        onReleaseError={() => setIsReleaseTriggered(false)}
        onReleaseSuccess={handleReleaseSuccess}
      />

      <CreateTagModal
        isOpen={createTagModalOpen}
        targetCommitOid={targetCommitForTag.oid}
        targetCommitSummary={targetCommitForTag.summary}
        onClose={() => setCreateTagModalOpen(false)}
        onCreateTag={async (name, targetCommit, message, pushToRemote) => {
          const success = await createTag(name, targetCommit, message);
          if (success && pushToRemote) {
            await handlePushTag(name);
          }
          await refreshTags();
          return success;
        }}
      />

      <TagDetailsModal
        isOpen={tagDetailsModalOpen}
        tag={selectedTagForModal}
        initialShowDeleteConfirm={tagModalInitialDelete}
        onClose={() => {
          setTagDetailsModalOpen(false);
          setSelectedTagForModal(null);
          setTagModalInitialDelete(false);
        }}
        onUpdateTag={async (oldName, newName, targetCommit, message) => {
          return await updateTag(oldName, newName, targetCommit, message);
        }}
        onPushTag={(name) => {
          handlePushTag(name);
        }}
        onFetchTag={async (name) => {
          try {
            await fetchTag(name);
          } catch (err) {
            console.error("Error al descargar etiqueta:", err);
          }
        }}
        onDeleteTag={async (name, deleteLocal, deleteRemote) => {
          await deleteTag(name, deleteLocal, deleteRemote);
          setTagDetailsModalOpen(false);
          setSelectedTagForModal(null);
        }}
      />

      <UndoCommitModal
        isOpen={undoCommitModalOpen}
        commit={commitToUndo}
        onClose={() => {
          setUndoCommitModalOpen(false);
          setCommitToUndo(null);
        }}
        onConfirm={handleConfirmUndoCommit}
      />

      <DiscardChangesModal
        isOpen={discardModalOpen}
        target={discardTarget}
        onClose={() => {
          setDiscardModalOpen(false);
          setDiscardTarget(null);
        }}
        onConfirm={handleConfirmDiscard}
      />

      <ConflictResolverModal
        isOpen={conflictModalOpen}
        conflict={selectedConflict}
        loading={conflictLoading}
        onResolve={resolveConflict}
        onClose={closeConflictModal}
      />
    </div>
  );
};
