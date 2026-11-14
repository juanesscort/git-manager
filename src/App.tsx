import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  GitBranch,
  RefreshCw,
  FolderGit2,
  FolderPlus,
  FileText,
  GitGraph,
  Split,
  Maximize2,
  X,
  Cloud,
  Tag,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import logoImg from "./assets/logo.png";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Splitter } from "./components/ui/Splitter";
import { CreateBranchModal } from "./components/ui/CreateBranchModal";
import { BranchMergeModal } from "./components/ui/BranchMergeModal";
import { BranchContextMenu, BranchContextMenuState } from "./components/ui/BranchContextMenu";
import { CommitContextMenu, CommitContextMenuState } from "./components/ui/CommitContextMenu";
import { FileContextMenu, FileContextMenuState } from "./components/ui/FileContextMenu";
import { CreatePullRequestModal } from "./features/github-sync/components/CreatePullRequestModal";
import { PullRequestHubModal } from "./features/github-sync/components/pr-hub/PullRequestHubModal";
import { ActionsHubModal } from "./features/github-sync/components/actions-hub/ActionsHubModal";
import { ReleaseWizardModal } from "./features/git-ops/components/ReleaseWizardModal";
import { useGitHubActions } from "./features/github-sync/hooks/useGitHubActions";
import { RepoTabBar } from "./components/ui/RepoTabBar";
import { OpenRepoModal } from "./components/ui/OpenRepoModal";
import { EmbeddedTerminal } from "./components/ui/EmbeddedTerminal";
import { AccordionSection } from "./components/ui/AccordionSection";
import { TagListView } from "./features/commit-graph/components/TagListView";
import { CreateTagModal } from "./features/commit-graph/components/CreateTagModal";
import { TagDetailsModal } from "./features/commit-graph/components/TagDetailsModal";
import { UndoCommitModal } from "./features/commit-graph/components/UndoCommitModal";
import { DiscardChangesModal } from "./features/staging-area/components/DiscardChangesModal";
import {
  GraphToolbarControls,
  GraphViewMode,
  VisibleColumns,
} from "./features/commit-graph/components/GraphToolbarControls";
import { useRepoTabs } from "./hooks/useRepoTabs";
import { GitToolbar } from "./features/git-ops/components/GitToolbar";
import { useGitToolbar } from "./hooks/useGitToolbar";
import { useRepo } from "./hooks/useRepo";
import { useStaging } from "./features/staging-area/hooks/useStaging";
import { useCommitGraph } from "./features/commit-graph/hooks/useCommitGraph";
import { useBranches } from "./features/commit-graph/hooks/useBranches";
import { useTags } from "./features/commit-graph/hooks/useTags";
import { useCommitDetails } from "./features/commit-graph/hooks/useCommitDetails";
import { useGitHub } from "./features/github-sync/hooks/useGitHub";
import { useAiAssistant } from "./features/ai-assistant/hooks/useAiAssistant";
import { useConflictResolver } from "./features/conflict-resolver/hooks/useConflictResolver";
import { StagingArea } from "./features/staging-area/components/StagingArea";
import { CommitGraph } from "./features/commit-graph/components/CommitGraph";
import { BranchTreeView } from "./features/commit-graph/components/BranchTreeView";
import { DiffViewer } from "./features/staging-area/components/DiffViewer";
import { CommitDetailsPanel } from "./features/commit-graph/components/CommitDetailsPanel";
import { GitHubAuthModal } from "./features/github-sync/components/GitHubAuthModal";
import { RemoteReposModal } from "./features/github-sync/components/RemoteReposModal";
import { AppSettingsModal } from "./components/ui/AppSettingsModal";
import { ConflictResolverModal } from "./features/conflict-resolver/components/ConflictResolverModal";
import { useAppUpdater } from "./hooks/useAppUpdater";
import { CommitInfo, DiffDelta, PullRequestItem, UnifiedGitTag } from "./types/git";
import "./App.css";

export interface OpenDiffTab {
  id: string;
  path: string;
  name: string;
  type: "staging" | "commit";
  staged?: boolean;
  commitOid?: string;
}

export const App: React.FC = () => {
  // Multi-project Tabs management
  const {
    tabs,
    activeTabId,
    activeTab,
    recentRepos,
    openTab,
    closeTab,
    switchTab,
    reorderTabs,
    updateTabBranch,
    setRepoPathChanges,
    clearRecentRepos,
  } = useRepoTabs();

  const [openRepoModalOpen, setOpenRepoModalOpen] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const activeRepoPath = activeTab?.path || "";

  const { repoPath, summary, refreshRepo } = useRepo(activeRepoPath);

  // Sync active tab's branch badge with the current summary (strictly validating path match)
  useEffect(() => {
    if (
      summary?.current_branch &&
      activeTabId &&
      summary.path &&
      activeRepoPath &&
      summary.path === activeRepoPath
    ) {
      updateTabBranch(activeTabId, summary.current_branch);
    }
  }, [summary?.current_branch, summary?.path, activeTabId, activeRepoPath, updateTabBranch]);

  // Resizable panel dimensions & collapsed states (Flechas 2, 3, 4)
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

  // Center Area display mode & Multi-tab Diff Management (Flecha 1)
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

  const {
    user: githubUser,
    deviceAuth,
    authModalOpen,
    reposModalOpen,
    repositories,
    reposLoading,
    error: githubError,
    checking: githubChecking,
    checkStatus: githubCheckStatus,
    startDeviceAuth,
    checkAuthorizationNow,
    savePersonalAccessToken,
    logout: logoutGitHub,
    fetchRepositories,
    closeAuthModal,
    closeReposModal,
  } = useGitHub();

  const {
    config: aiConfig,
    configModalOpen: aiConfigModalOpen,
    generating: aiGenerating,
    saveConfig: saveAiConfig,
    generateCommit,
    openConfigModal: openAiConfigModal,
    closeConfigModal: closeAiConfigModal,
  } = useAiAssistant();

  const [settingsTab, setSettingsTab] = useState<"ai" | "about">("ai");

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

  const handleOpenSettings = (tab: "ai" | "about" = "ai") => {
    setSettingsTab(tab);
    openAiConfigModal();
  };

  const {
    status: appUpdateStatus,
    updateObj: appUpdateObj,
    manualRelease: appManualRelease,
    progress: appUpdateProgress,
    error: appUpdateError,
    checkForUpdates: checkAppForUpdates,
    installUpdate: installAppUpdate,
  } = useAppUpdater();

  const hasAppUpdate =
    appUpdateStatus === "available" || appUpdateStatus === "manual-available";
  const appUpdateVersion =
    appUpdateObj?.version ||
    (appManualRelease?.version ? appManualRelease.version.replace(/^v/, "") : null) ||
    "0.5.0";

  useEffect(() => {
    // Check for updates in the background on startup (silent)
    checkAppForUpdates();
  }, [checkAppForUpdates]);

  const {
    graphNodes,
    selectedCommit,
    loading: commitsLoading,
    setSelectedCommit,
    refreshCommits,
  } = useCommitGraph(activeRepoPath);

  const matchesCount = useMemo(() => {
    if (!graphSearchQuery.trim()) return graphNodes.length;
    const q = graphSearchQuery.toLowerCase().trim();
    return graphNodes.filter(
      (n) =>
        n.commit.summary.toLowerCase().includes(q) ||
        n.commit.message.toLowerCase().includes(q) ||
        n.commit.oid.toLowerCase().includes(q) ||
        n.commit.short_oid.toLowerCase().includes(q) ||
        n.commit.author_name.toLowerCase().includes(q) ||
        n.commit.author_email.toLowerCase().includes(q)
    ).length;
  }, [graphNodes, graphSearchQuery]);

  const { branches, refreshBranches } = useBranches(activeRepoPath);

  const {
    tags,
    loading: tagsLoading,
    refreshTags,
    pushTag,
    fetchTag,
    createTag,
    updateTag,
    deleteTag,
  } = useTags(activeRepoPath);

  const [pushingTag, setPushingTag] = useState<string | null>(null);

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
    if (!activeRepoPath) return;
    try {
      await invoke("undo_commit_cmd", {
        path: activeRepoPath,
        keepStaged,
      });
      await handleRefreshAll();
      setSelectedCommit(null);
      setIsWipSelected(true);
      setActiveCenterTab("graph");
    } catch (err: unknown) {
      console.error("Error al deshacer commit:", err);
      throw err;
    }
  };

  // Check if current repo is Git-Manager
  useEffect(() => {
    if (!activeRepoPath) {
      setIsGitManagerRepo(false);
      return;
    }
    invoke<boolean>("is_git_manager_repo_cmd", { path: activeRepoPath })
      .then((isGm) => setIsGitManagerRepo(isGm))
      .catch(() => setIsGitManagerRepo(false));
  }, [activeRepoPath]);

  // Actions Repo Slug and Hook
  const actionsRepoSlug = useMemo(() => {
    if (!summary?.remote_url || !summary.path || summary.path !== activeRepoPath) return "";
    let clean = summary.remote_url.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "");
    } else if (clean.startsWith("https://github.com/")) {
      clean = clean.replace("https://github.com/", "");
    }
    return clean.replace(/\.git$/, "");
  }, [summary?.remote_url, summary?.path, activeRepoPath]);

  const { activeRunsCount, latestRunStatus, fetchRuns } = useGitHubActions(actionsRepoSlug);
  const [isReleaseTriggered, setIsReleaseTriggered] = useState<boolean>(false);

  // Sync optimistic release state once real GitHub workflow run arrives
  useEffect(() => {
    if (activeRunsCount > 0 && isReleaseTriggered) {
      setIsReleaseTriggered(false);
    }
  }, [activeRunsCount, isReleaseTriggered]);

  // Safety fallback: if no run appears after 60s, reset optimistic flag
  useEffect(() => {
    if (!isReleaseTriggered) return;
    const timer = setTimeout(() => setIsReleaseTriggered(false), 60000);
    return () => clearTimeout(timer);
  }, [isReleaseTriggered]);

  const effectiveActiveRunsCount = isReleaseTriggered ? Math.max(activeRunsCount, 1) : activeRunsCount;
  const effectiveActionsStatus = isReleaseTriggered && activeRunsCount === 0 ? "in_progress" : latestRunStatus;

  // Sync native OS window title with GitManager PRO and current project
  useEffect(() => {
    try {
      const win = getCurrentWindow();
      const title = activeTab
        ? `GitManager PRO v${__APP_VERSION__} - [${activeTab.name}]`
        : `GitManager PRO v${__APP_VERSION__}`;
      win.setTitle(title);
    } catch {
      // Ignored outside desktop window context
    }
  }, [activeTab]);

  const {
    files: commitFiles,
    loading: commitFilesLoading,
  } = useCommitDetails(activeRepoPath, selectedCommit);

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
  } = useStaging(activeRepoPath, () => {
    refreshCommits();
    refreshRepo();
    refreshBranches();
    refreshTags();
    checkConflicts();
  });

  const {
    conflictedFiles,
    selectedConflict,
    modalOpen: conflictModalOpen,
    loading: conflictLoading,
    checkConflicts,
    openConflictModal,
    resolveConflict,
    closeModal: closeConflictModal,
  } = useConflictResolver(activeRepoPath, () => {
    refreshStatuses();
    refreshCommits();
    refreshRepo();
    refreshBranches();
    refreshTags();
  });

  useEffect(() => {
    checkConflicts();
  }, [checkConflicts, activeRepoPath]);

  const loadTabDiff = async (tab: OpenDiffTab) => {
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
  };

  const openFileTab = (
    file: { path: string; staged?: boolean; commitOid?: string; type: "staging" | "commit" },
    autoSwitch: boolean = true
  ) => {
    const fileName = file.path.split("/").pop() || file.path;
    const tabId =
      file.type === "commit"
        ? `commit:${file.commitOid || "head"}:${file.path}`
        : `staging:${file.staged ? "staged" : "unstaged"}:${file.path}`;

    const existingIndex = openDiffTabs.findIndex((t) => t.id === tabId);
    if (existingIndex !== -1) {
      if (autoSwitch) {
        setActiveCenterTab(tabId);
      }
      return;
    }

    if (openDiffTabs.length >= 5) {
      setTabLimitWarning(
        "Límite de 5 archivos alcanzado. Cierra al menos una pestaña para poder abrir otra."
      );
      if (tabWarningTimeoutRef.current) {
        clearTimeout(tabWarningTimeoutRef.current);
      }
      tabWarningTimeoutRef.current = setTimeout(() => {
        setTabLimitWarning(null);
      }, 4500);
      return;
    }

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
  };

  const closeDiffTab = (tabId: string) => {
    setOpenDiffTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeCenterTab === tabId) {
      setActiveCenterTab("graph");
    }
    setTabLimitWarning(null);
  };

  const refreshPrCount = useCallback(async () => {
    if (!summary?.remote_url || !summary.path || summary.path !== activeRepoPath || !githubUser) {
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
  }, [summary?.remote_url, summary?.path, activeRepoPath, githubUser]);

  useEffect(() => {
    refreshPrCount();
  }, [refreshPrCount]);

  const handleRefreshAll = useCallback(() => {
    if (!activeRepoPath || activeRepoPath === ".") return;
    refreshRepo();
    refreshStatuses();
    refreshCommits();
    checkConflicts();
    refreshBranches();
    refreshTags();
    refreshPrCount();
    // Actualizar diffs de pestañas abiertas
    openDiffTabs.forEach((tab) => {
      if (tab.type === "commit" && tab.commitOid) {
        invoke<DiffDelta>("get_commit_file_diff_cmd", {
          path: activeRepoPath,
          commitOid: tab.commitOid,
          relativePath: tab.path,
        })
          .then((delta) => setDiffCache((prev) => ({ ...prev, [tab.id]: delta })))
          .catch(() => {});
      } else {
        invoke<DiffDelta>("get_diff_cmd", {
          path: activeRepoPath,
          relativePath: tab.path,
          staged: Boolean(tab.staged),
        })
          .then((delta) => setDiffCache((prev) => ({ ...prev, [tab.id]: delta })))
          .catch(() => {});
      }
    });
  }, [
    refreshRepo,
    refreshStatuses,
    refreshCommits,
    checkConflicts,
    refreshBranches,
    refreshTags,
    refreshPrCount,
    openDiffTabs,
    activeRepoPath,
  ]);

  // Discard Unstaged Changes State & Handlers
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
    // Aggressive polling to catch GitHub Actions run as soon as it initializes on GitHub
    const delays = [1000, 2500, 4500, 7000, 10000, 15000, 20000];
    delays.forEach((delay) => {
      setTimeout(() => {
        fetchRuns().catch(() => {});
      }, delay);
    });
  }, [handleRefreshAll, fetchRuns]);

  // Active repository filesystem watcher
  useEffect(() => {
    if (activeRepoPath) {
      invoke("watch_repo_path_cmd", { path: activeRepoPath }).catch((err) => {
        console.warn("Error starting repository watcher:", err);
      });
    }
  }, [activeRepoPath]);

  const activeRepoPathRef = useRef(activeRepoPath);
  activeRepoPathRef.current = activeRepoPath;

  const refreshStatusesRef = useRef(refreshStatuses);
  refreshStatusesRef.current = refreshStatuses;

  const checkConflictsRef = useRef(checkConflicts);
  checkConflictsRef.current = checkConflicts;

  // Real-time synchronization: repo-fs-changed (filtered by repository path payload)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("repo-fs-changed", (event) => {
      if (
        event.payload &&
        activeRepoPathRef.current &&
        event.payload !== activeRepoPathRef.current
      ) {
        return;
      }
      refreshStatusesRef.current();
      checkConflictsRef.current();
    }).then((unsub) => {
      unlisten = unsub;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Window focus synchronization when user returns from external editors or terminals
  useEffect(() => {
    const handleWindowFocus = () => {
      refreshStatusesRef.current();
      checkConflictsRef.current();
    };
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

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
        refreshBranches();
        refreshRepo();
        refreshCommits();
        return;
      }
      if (opName === "Stash" || opName === "Pop Stash") {
        refreshStatuses();
        refreshRepo();
        return;
      }
      // Operations modifying tree and commits (Pull, Push, Merge, Rebase)
      refreshRepo();
      refreshStatuses();
      refreshCommits();
      refreshBranches();
      checkConflicts();
    },
    [refreshBranches, refreshCommits, refreshRepo, refreshStatuses, checkConflicts]
  );

  // Git Operations Toolbar (Flecha 1)
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
    setNotification: setToolbarNotification,
  } = useGitToolbar(activeRepoPath, handleToolbarOperationSuccess);

  const handlePushTag = async (tagName: string) => {
    setPushingTag(tagName);
    try {
      const msg = await pushTag(tagName);
      setToolbarNotification(msg || `Etiqueta '${tagName}' subida a GitHub`);
    } catch (err: unknown) {
      setToolbarNotification(null, err instanceof Error ? err.message : String(err));
    } finally {
      setPushingTag(null);
    }
  };

  // Keep each repository's pending changes counter updated without leaking between tabs (Flecha 5)
  const pendingChangesCount = stagedFiles.length + unstagedFiles.length;
  useEffect(() => {
    if (
      !stagingLoading &&
      activeRepoPath &&
      activeRepoPath !== "." &&
      activeTab?.path === activeRepoPath
    ) {
      setRepoPathChanges(activeRepoPath, pendingChangesCount);
    }
  }, [stagingLoading, activeRepoPath, activeTab?.path, pendingChangesCount, setRepoPathChanges]);

  // Drag & drop branch merge / pull / push state
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
    // If dropping a remote branch onto another remote branch, open Pull Request Creator directly!
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

  // Branch right-click context menu state
  const [contextMenuState, setContextMenuState] = useState<BranchContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    branchName: "",
    isHead: false,
    isRemote: false,
  });

  const handleOpenBranchContextMenu = (
    x: number,
    y: number,
    branchName: string,
    isHead: boolean,
    isRemote: boolean,
    commitOid?: string
  ) => {
    setContextMenuState({
      isOpen: true,
      x,
      y,
      branchName,
      isHead,
      isRemote,
      commitOid,
    });
  };

  // Commit right-click context menu state
  const [commitContextMenuState, setCommitContextMenuState] = useState<CommitContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    commit: null,
  });

  const handleOpenCommitContextMenu = (x: number, y: number, commit: CommitInfo) => {
    setCommitContextMenuState({
      isOpen: true,
      x,
      y,
      commit,
    });
  };

  // File Context Menu State & Actions (Flechas 2 y 3)
  const [fileContextMenuState, setFileContextMenuState] = useState<FileContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    relativePath: "",
    repoPath: "",
    source: "tab",
  });

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
      repoPath: activeRepoPath,
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
    if (!activeRepoPath) return;
    try {
      await invoke("add_to_gitignore_cmd", {
        repoPath: activeRepoPath,
        pattern,
      });
      await refreshStatuses();
    } catch (err) {
      console.error("Error al agregar a .gitignore:", err);
    }
  };

  // Restore Commit File Safety Confirmation Modal State
  const [restoreFileTarget, setRestoreFileTarget] = useState<{
    commitOid: string;
    relativePath: string;
  } | null>(null);

  const handleRequestRestoreCommitFile = (commitOid: string, relativePath: string) => {
    setRestoreFileTarget({ commitOid, relativePath });
  };

  const handleConfirmRestoreCommitFile = async () => {
    if (!activeRepoPath || !restoreFileTarget) return;
    try {
      await invoke("restore_commit_file_cmd", {
        repoPath: activeRepoPath,
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

  // Center Diff Tabs Drag and Drop Reordering (Flecha 1)
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

  // Pull Request Modal state
  const [pullRequestModalOpen, setPullRequestModalOpen] = useState<boolean>(false);
  const [prInitialHead, setPrInitialHead] = useState<string>("dev");
  const [prInitialBase, setPrInitialBase] = useState<string>("main");

  const handleOpenPullRequest = (headBranch?: string, baseBranch?: string) => {
    if (headBranch) {
      setPrInitialHead(headBranch);
    }
    if (baseBranch) {
      setPrInitialBase(baseBranch);
    }
    setPullRequestModalOpen(true);
  };

  const hasUncommittedChanges = stagedFiles.length > 0 || unstagedFiles.length > 0;

  const currentBranchName = summary?.current_branch || "main";
  const currentBranchInfo = branches.local.find((b) => b.is_head || b.name === currentBranchName);
  const aheadCount = currentBranchInfo?.ahead ?? 0;
  const behindCount = currentBranchInfo?.behind ?? 0;
  const hasUpstream = Boolean(currentBranchInfo?.upstream_name);

  // Toggle commit selection on click (or deselect)
  const handleSelectCommit = (commit: CommitInfo) => {
    setIsWipSelected(false);
    if (selectedCommit?.oid === commit.oid) {
      setSelectedCommit(null);
    } else {
      setSelectedCommit(commit);
    }
  };

  // Navigate to commit on graph without checkout
  const handleNavigateToCommit = (targetOid: string) => {
    setActiveCenterTab("graph");
    setIsWipSelected(false);
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

  // Navigate to branch tip commit on graph without checkout
  const handleSelectBranchCommit = (_branchName: string, targetOid: string) => {
    handleNavigateToCommit(targetOid);
  };

  // Multi-tab Active Tab & Diff resolution
  const currentActiveTab = openDiffTabs.find((t) => t.id === activeCenterTab) || null;
  const currentDiff = currentActiveTab ? diffCache[currentActiveTab.id] || null : null;
  const currentDiffLoading = currentActiveTab ? Boolean(diffLoadingMap[currentActiveTab.id]) : false;

  const splitActiveTab =
    currentActiveTab || (openDiffTabs.length > 0 ? openDiffTabs[openDiffTabs.length - 1] : null);
  const splitDiff = splitActiveTab ? diffCache[splitActiveTab.id] || null : null;
  const splitDiffLoading = splitActiveTab ? Boolean(diffLoadingMap[splitActiveTab.id]) : false;

  // Auto-revert split view to full view if no diff tabs remain open
  useEffect(() => {
    if (openDiffTabs.length === 0 && centerViewMode === "split") {
      setCenterViewMode("full");
    }
  }, [openDiffTabs.length, centerViewMode]);

  const handleSwitchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return;
      setSelectedCommit(null);
      setIsWipSelected(false);
      setOpenDiffTabs([]);
      setDiffCache({});
      setDiffLoadingMap({});
      setTabLimitWarning(null);
      setActiveCenterTab("graph");
      switchTab(tabId);
    },
    [activeTabId, switchTab]
  );

  // Trigger full refresh when activeRepoPath changes
  const prevActiveRepoPathRef = useRef<string>(activeRepoPath);
  useEffect(() => {
    if (activeRepoPath && activeRepoPath !== prevActiveRepoPathRef.current) {
      prevActiveRepoPathRef.current = activeRepoPath;
      setSelectedCommit(null);
      setIsWipSelected(false);
      setOpenDiffTabs([]);
      setDiffCache({});
      setDiffLoadingMap({});
      setTabLimitWarning(null);
      setActiveCenterTab("graph");
      handleRefreshAll();
    }
  }, [activeRepoPath, handleRefreshAll]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] select-none overflow-hidden">
      {/* GitKraken-Style Multi-Project Top Tab Bar with User Profile on Right */}
      <RepoTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        user={githubUser}
        notificationCount={toolbarMessage || toolbarError ? 1 : 0}
        hasUpdate={hasAppUpdate}
        updateVersion={appUpdateVersion}
        onOpenUpdates={() => handleOpenSettings("about")}
        onSwitchTab={handleSwitchTab}
        onCloseTab={closeTab}
        onReorderTabs={reorderTabs}
        onOpenNewTab={() => setOpenRepoModalOpen(true)}
        onOpenAuth={startDeviceAuth}
        onLogout={logoutGitHub}
        onOpenRepos={fetchRepositories}
        onOpenSettings={() => handleOpenSettings("ai")}
      />

      {/* Top Navigation Bar & GitKraken Action Toolbar */}
      <header className="h-14 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          {/* Logo & Application Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={logoImg}
                alt="GitManager"
                className={`h-11 w-11 object-contain shrink-0 filter drop-shadow-[0_0_16px_rgba(56,189,248,0.55)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)] transition-transform hover:scale-105 cursor-pointer ${
                  hasAppUpdate ? "animate-pulse" : ""
                }`}
                onClick={() => handleOpenSettings("about")}
                title="GitManager PRO - Clic para ver acerca de y actualizaciones"
              />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-white via-[#c9d1d9] to-blue-300 bg-clip-text text-transparent">
                  GitManager
                </h1>
                <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 text-amber-300 border border-amber-500/40 shadow-xs uppercase select-none">
                  PRO
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenSettings("about")}
                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#21262d] text-[#8b949e] hover:text-blue-300 hover:border-blue-500/40 border border-[#30363d] cursor-pointer transition-all"
                  title={`GitManager PRO v${__APP_VERSION__} (clic para ver actualizaciones)`}
                >
                  v{__APP_VERSION__}
                </button>
              </div>

              {hasAppUpdate ? (
                <button
                  type="button"
                  onClick={() => handleOpenSettings("about")}
                  className="flex items-center text-[10px] font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors group mt-0.5 text-left animate-pulse"
                  title={`¡Nueva versión v${appUpdateVersion} disponible! Clic para actualizar`}
                >
                  <span className="group-hover:underline">
                    Nueva versión v{appUpdateVersion} disponible
                  </span>
                </button>
              ) : (
                <span className="text-[10px] text-[#8b949e] mt-0.5">
                  Cliente Git & GitHub nativo
                </span>
              )}
            </div>

            <span className="text-[#484f58] font-thin mx-1">/</span>

            {activeTab && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#8b949e] text-[11px] font-sans font-medium">Repositorio:</span>
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-blue-500/30 font-semibold truncate max-w-[150px]"
                  title={`Repositorio: ${activeTab.name} (${activeTab.path})`}
                >
                  {activeTab.name}
                </span>
              </div>
            )}
            {summary?.current_branch && (
              <div className="flex items-center gap-1.5 text-xs ml-1.5">
                <span className="text-[#8b949e] text-[11px] font-sans font-medium">Rama:</span>
                <Badge
                  label={summary.current_branch}
                  variant="purple"
                  icon={<GitBranch className="w-3 h-3 text-purple-400" />}
                />
              </div>
            )}
          </div>
        </div>

        {/* Flecha 6: Vertical GitKraken Action Toolbar with Terminal button */}
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
          onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
          onOpenPullRequests={() => setPrHubOpen(true)}
          onOpenActions={() => setActionsHubOpen(true)}
          onOpenReleaseWizard={() => setReleaseWizardOpen(true)}
          onShowBanner={(err) => setToolbarNotification(null, err)}
          onClearNotification={clearToolbarNotification}
        />

        {/* Right Section: Single Unified Refresh */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${stagingLoading || commitsLoading ? "animate-pulse text-blue-400" : ""}`} />}
            onClick={handleRefreshAll}
            title="Sincronizar todo el repositorio"
            className="h-8 text-xs font-medium"
          >
            Sincronizar
          </Button>
        </div>
      </header>

      {/* Main Studio Layout with Resizable Columns or Empty Workspace */}
      {tabs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0d1117] select-none text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-center mb-4">
            <FolderGit2 className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No hay ningún repositorio abierto</h2>
          <p className="text-xs text-[#8b949e] max-w-md mb-6 leading-relaxed">
            Abre un repositorio local de tu equipo o clona un repositorio directamente desde tu cuenta de GitHub para comenzar a gestionar ramas, commits y diferencias.
          </p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setOpenRepoModalOpen(true)}
              icon={<FolderPlus className="w-4 h-4" />}
            >
              Abrir o Clonar Repositorio
            </Button>
          </div>
          {recentRepos.length > 0 && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                O reabrir reciente
              </span>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mt-1">
                {recentRepos.slice(0, 5).map((path) => {
                  const name = path.split("/").filter(Boolean).pop() || path;
                  return (
                    <button
                      key={path}
                      onClick={() => openTab(path)}
                      className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-blue-500/60 hover:text-white text-xs text-[#8b949e] transition-all flex items-center gap-1.5 font-mono"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Collapsed 36px rail OR Expanded Aside (Flechas 3 & 4) */}
          {leftCollapsed ? (
            <div
              onClick={handleToggleLeftPanel}
              className="w-9 h-full bg-[#0d1117] border-r border-[#30363d] flex flex-col items-center py-3 gap-3 shrink-0 cursor-pointer select-none hover:bg-[#161b22] transition-colors group z-10"
              title="Expandir panel izquierdo (Ramas y Etiquetas)"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLeftPanel();
                }}
                className="p-1.5 rounded text-[#8b949e] group-hover:text-white group-hover:bg-[#21262d] transition-colors cursor-pointer"
                title="Expandir panel lateral izquierdo"
              >
                <ChevronRight className="w-4 h-4 text-blue-400" />
              </button>
              <div className="flex items-center gap-1 mt-1">
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-mono text-[#8b949e]">{branches.local.length}</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span
                  className="text-[11px] font-semibold text-[#8b949e] group-hover:text-[#c9d1d9] tracking-wider uppercase whitespace-nowrap select-none"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Ramas & Etiquetas
                </span>
              </div>
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

                <nav className="flex flex-col gap-2 text-xs overflow-y-auto flex-1 no-scrollbar">
                  {/* 1. Local Branches Accordion */}
                  <AccordionSection
                    title="Ramas Locales"
                    count={branches.local.length}
                    icon={<GitBranch className="w-3.5 h-3.5 text-blue-400" />}
                    defaultOpen={true}
                  >
                    <BranchTreeView
                      key={`local-${activeRepoPath}`}
                      branches={branches.local}
                      currentBranch={currentBranchName}
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
                    action={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchRemote();
                        }}
                        disabled={toolbarOperating}
                        className="p-1 rounded text-[#8b949e] hover:text-purple-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                        title="Sincronizar ramas remotas con GitHub (Fetch & Prune)"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            toolbarOperating && toolbarActiveOp === "fetch"
                              ? "animate-spin text-purple-400"
                              : ""
                          }`}
                        />
                      </button>
                    }
                  >
                    <BranchTreeView
                      key={`remote-${activeRepoPath}`}
                      branches={branches.remote}
                      isRemote={true}
                      onSelectBranch={handleSelectBranchCommit}
                      onContextMenu={handleOpenBranchContextMenu}
                      onDropBranch={handleDropBranch}
                    />
                  </AccordionSection>

                  {/* 3. Tags / Etiquetas Accordion (Flechas 2 y 4) */}
                  <AccordionSection
                    title="Etiquetas (Tags)"
                    count={tags.length}
                    icon={<Tag className="w-3.5 h-3.5 text-emerald-400" />}
                    defaultOpen={true}
                    action={
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            refreshTags();
                          }}
                          className="p-1 rounded text-[#8b949e] hover:text-emerald-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                          title="Actualizar lista de etiquetas (Tags)"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              tagsLoading ? "animate-spin text-emerald-400" : ""
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedCommit) {
                              setTargetCommitForTag({
                                oid: selectedCommit.oid,
                                summary: selectedCommit.summary,
                              });
                            } else {
                              setTargetCommitForTag({ oid: "HEAD" });
                            }
                            setCreateTagModalOpen(true);
                          }}
                          className="p-1 rounded text-[#8b949e] hover:text-emerald-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                          title={
                            selectedCommit
                              ? `Crear etiqueta sobre commit ${selectedCommit.short_oid}`
                              : "Crear nueva etiqueta sobre HEAD"
                          }
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    }
                  >
                    <TagListView
                      tags={tags}
                      onSelectTag={(targetCommitId) => {
                        const node = graphNodes.find((n) => n.commit.oid === targetCommitId);
                        if (node) {
                          setSelectedCommit(node.commit);
                        }
                        setIsWipSelected(false);
                        setActiveCenterTab("graph");
                        setTimeout(() => {
                          const el = document.getElementById(`commit-row-${targetCommitId}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }, 50);
                      }}
                      onOpenTagDetails={(tag) => {
                        setTagModalInitialDelete(false);
                        setSelectedTagForModal(tag);
                        setTagDetailsModalOpen(true);
                      }}
                      onOpenDeleteTag={(tag) => {
                        setTagModalInitialDelete(true);
                        setSelectedTagForModal(tag);
                        setTagDetailsModalOpen(true);
                      }}
                      onDeleteTag={async (name, deleteLocal, deleteRemote) => {
                        await deleteTag(name, deleteLocal, deleteRemote);
                      }}
                      onPushTag={handlePushTag}
                      onFetchTag={async (name) => {
                        try {
                          await fetchTag(name);
                        } catch (err) {
                          console.error("Error al descargar tag:", err);
                        }
                      }}
                      pushingTag={pushingTag}
                    />
                  </AccordionSection>
                </nav>
              </aside>

              {/* Flecha 2: Resizable Left Splitter */}
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

        {/* Center Canvas: Commit Graph & Central Diff Viewer (Flecha 6 & Flecha 4) */}
        <main className="flex-1 flex flex-col bg-[#010409] overflow-hidden min-w-0">
          {/* Permanent Center Tab Header (Flecha 1) */}
          <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {/* Permanent Tab 1: Commit Graph */}
              <button
                onClick={() => setActiveCenterTab("graph")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                  activeCenterTab === "graph"
                    ? "bg-[#21262d] text-white border border-[#30363d] shadow-xs"
                    : "text-[#8b949e] hover:text-white hover:bg-[#21262d]/50"
                }`}
              >
                <GitGraph className="w-3.5 h-3.5 text-blue-400" />
                <span>Grafo de Commits</span>
              </button>

              {/* Dynamic Open Diff Tabs (Up to 5) */}
              {openDiffTabs.map((tab, idx) => {
                const isActive = activeCenterTab === tab.id;
                const isDragging = draggedDiffIndex === idx;
                const isOver = dragOverDiffIndex === idx && draggedDiffIndex !== idx;

                return (
                  <div
                    key={tab.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("application/git-diff-tab", idx.toString());
                      setDraggedDiffIndex(idx);
                    }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes("application/git-diff-tab")) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverDiffIndex !== idx) {
                          setDragOverDiffIndex(idx);
                        }
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverDiffIndex === idx) {
                        setDragOverDiffIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedDiffIndex !== null && draggedDiffIndex !== idx) {
                        handleReorderDiffTabs(draggedDiffIndex, idx);
                      }
                      setDraggedDiffIndex(null);
                      setDragOverDiffIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedDiffIndex(null);
                      setDragOverDiffIndex(null);
                    }}
                    onContextMenu={(e) =>
                      handleOpenFileContextMenu(e, tab.path, "tab", {
                        tabId: tab.id,
                        commitOid: tab.commitOid,
                      })
                    }
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#1f6feb]/20 border-blue-500/50 text-white shadow-xs"
                        : "bg-[#21262d]/70 border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                    } ${isDragging ? "opacity-40 scale-95" : ""} ${
                      isOver ? "border-l-2 border-l-blue-400 bg-blue-500/20" : ""
                    }`}
                    title={`${tab.path} - Arrastra para reordenar, clic derecho para opciones`}
                  >
                    <button
                      onClick={() => setActiveCenterTab(tab.id)}
                      className="flex items-center gap-1.5 max-w-[170px] truncate cursor-pointer"
                      title={tab.path}
                    >
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          tab.type === "commit"
                            ? "text-purple-400"
                            : tab.staged
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      />
                      <span className="font-mono text-xs truncate">{tab.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDiffTab(tab.id);
                      }}
                      className="ml-1 p-0.5 hover:text-rose-400 rounded text-[#8b949e] hover:bg-[#30363d] transition-colors cursor-pointer"
                      title={`Cerrar ${tab.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right Controls: Graph Toolbar Controls & View Mode Controls */}
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {/* Graph Toolbar Controls (Search, Columns Filter, Graph Settings) */}
              <GraphToolbarControls
                searchQuery={graphSearchQuery}
                onSearchChange={setGraphSearchQuery}
                matchesCount={matchesCount}
                totalCount={graphNodes.length}
                visibleColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
                viewMode={graphViewMode}
                onChangeViewMode={handleChangeViewMode}
                showCommitBody={showCommitBody}
                onToggleShowCommitBody={handleToggleShowCommitBody}
                onResetColumnWidths={handleResetColumnWidths}
              />

              {/* View Mode Controls (Split vs Fullscreen) - Visible when diff tabs are open */}
              {openDiffTabs.length > 0 && (
                <div className="flex items-center gap-1 border-l border-[#30363d] pl-2">
                  {centerViewMode === "full" ? (
                    <button
                      onClick={() => setCenterViewMode("split")}
                      className="flex items-center justify-center p-1.5 rounded text-xs text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
                      title="Dividir pantalla: Ver Grafo y Diff simultáneamente"
                    >
                      <Split className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setCenterViewMode("full")}
                      className="flex items-center justify-center p-1.5 rounded text-xs text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
                      title="Pantalla completa para el Diff"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5-Tabs Maximum Limit Alert Notification */}
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

          {/* Canvas Body (Full View vs Split View) */}
          {centerViewMode === "full" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeCenterTab !== "graph" && currentActiveTab ? (
                <DiffViewer
                  diff={currentDiff}
                  loading={currentDiffLoading}
                  repoPath={activeRepoPath}
                  commitOid={currentActiveTab.commitOid}
                  staged={currentActiveTab.staged}
                  onClose={() => closeDiffTab(currentActiveTab.id)}
                  onContextMenu={(e, path) => handleOpenFileContextMenu(e, path, "diff_header")}
                />
              ) : (
                <CommitGraph
                  key={activeRepoPath}
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
            /* Split View: Commit Graph on top, Draggable Splitter, DiffViewer on bottom */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden min-h-[120px]">
                <CommitGraph
                  key={activeRepoPath}
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

              {/* Horizontal Resizable Splitter */}
              <Splitter
                direction="horizontal"
                title="Arrastra para cambiar la altura del visor de diferencias"
                onDrag={(e) =>
                  setDiffHeight(
                    Math.min(
                      Math.max(window.innerHeight - e.clientY, 140),
                      window.innerHeight - 200
                    )
                  )
                }
              />

              <div
                style={{ height: diffHeight }}
                className="shrink-0 flex flex-col overflow-hidden bg-[#0d1117]"
              >
                <DiffViewer
                  diff={splitDiff}
                  loading={splitDiffLoading}
                  repoPath={activeRepoPath}
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

          {/* Flecha 1: Embedded Linux Terminal Panel */}
          <EmbeddedTerminal
            repoPath={activeRepoPath}
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
          />
        </main>

        {/* Right Sidebar: Collapsed 36px rail OR Resizable Staging/Commit Details (Flechas 4 & 5) */}
        {rightCollapsed ? (
          <div
            onClick={handleToggleRightPanel}
            className="w-9 h-full bg-[#0d1117] border-l border-[#30363d] flex flex-col items-center py-3 gap-3 shrink-0 cursor-pointer select-none hover:bg-[#161b22] transition-colors group z-10"
            title="Expandir panel derecho (Área de Cambios)"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRightPanel();
              }}
              className="p-1.5 rounded text-[#8b949e] group-hover:text-white group-hover:bg-[#21262d] transition-colors cursor-pointer"
              title="Expandir panel lateral derecho"
            >
              <ChevronLeft className="w-4 h-4 text-blue-400" />
            </button>
            <div className="flex items-center gap-1 mt-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              {stagedFiles.length + unstagedFiles.length > 0 && (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1 rounded">
                  {stagedFiles.length + unstagedFiles.length}
                </span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span
                className="text-[11px] font-semibold text-[#8b949e] group-hover:text-[#c9d1d9] tracking-wider uppercase whitespace-nowrap select-none"
                style={{ writingMode: "vertical-rl" }}
              >
                {selectedCommit ? "Detalles del Commit" : "Área de Cambios (WIP)"}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Flecha 3: Resizable Right Splitter */}
            <Splitter
              direction="vertical"
              title="Arrastra para cambiar el ancho de la barra derecha"
              onDrag={(e) => {
                const w = Math.min(Math.max(window.innerWidth - e.clientX, 280), 650);
                setRightWidth(w);
                localStorage.setItem("gitmanager_panel_right_width", w.toString());
              }}
            />

            {/* Right Sidebar: Dynamic Mode (Flecha 5: CommitDetailsPanel OR StagingArea WIP) */}
            <div
              style={{ width: rightWidth }}
              className="h-full shrink-0 flex flex-col bg-[#0d1117] overflow-hidden select-none"
            >
              {selectedCommit ? (
                <CommitDetailsPanel
                  commit={selectedCommit}
                  files={commitFiles}
                  loading={commitFilesLoading}
                  selectedFilePath={
                    currentActiveTab?.commitOid === selectedCommit.oid ? currentActiveTab.path : null
                  }
                  isHead={selectedCommit?.oid === summary?.head_commit_oid}
                  githubAvatarUrl={githubUser?.avatar_url}
                  githubLogin={githubUser?.login}
                  onSelectFile={(path) => {
                    if (path) {
                      openFileTab({ path, commitOid: selectedCommit.oid, type: "commit" }, true);
                    } else {
                      setActiveCenterTab("graph");
                    }
                  }}
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
                  key={activeRepoPath}
                  repoPath={activeRepoPath}
                  stagedFiles={stagedFiles}
                  unstagedFiles={unstagedFiles}
                  conflictedFiles={conflictedFiles}
                  selectedFile={
                    currentActiveTab?.type === "staging"
                      ? { path: currentActiveTab.path, staged: Boolean(currentActiveTab.staged) }
                      : null
                  }
                  currentBranch={currentBranchName}
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
                      } catch (e) {
                        console.error("Error al crear etiqueta para commit:", e);
                      }
                    }
                    handleRefreshAll();
                  }}
                  onGenerateAiCommit={() => generateCommit(activeRepoPath)}
                  onOpenAiConfig={openAiConfigModal}
                  onOpenConflictResolver={openConflictModal}
                  onFileContextMenu={(e, path, isStaged, isConflicted, isUntracked) =>
                    handleOpenFileContextMenu(e, path, isStaged ? "wip_staged" : "wip_unstaged", {
                      isConflicted,
                      isUntracked,
                    })
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
      )}

      {/* New Branch Modal */}
      <CreateBranchModal
        isOpen={branchModalOpen}
        branches={branches}
        currentBranch={currentBranchName}
        onClose={() => setBranchModalOpen(false)}
        onCreate={(branchName, baseBranch) => {
          createNewBranch(branchName, baseBranch);
        }}
      />

      {/* Create Tag Modal */}
      <CreateTagModal
        isOpen={createTagModalOpen}
        targetCommitOid={targetCommitForTag.oid}
        targetCommitSummary={targetCommitForTag.summary}
        onClose={() => setCreateTagModalOpen(false)}
        onCreateTag={async (name, target, msg, pushToRemote) => {
          return await createTag(name, target, msg, pushToRemote);
        }}
      />

      {/* Tag Details & Edit Modal */}
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

      {/* GitHub Authentication Modal */}
      <GitHubAuthModal
        isOpen={authModalOpen}
        deviceAuth={deviceAuth}
        user={githubUser}
        error={githubError}
        checking={githubChecking}
        checkStatus={githubCheckStatus}
        onCheckNow={checkAuthorizationNow}
        onSaveToken={savePersonalAccessToken}
        onClose={closeAuthModal}
      />

      {/* GitHub Repositories Modal */}
      <RemoteReposModal
        isOpen={reposModalOpen}
        user={githubUser}
        repos={repositories}
        loading={reposLoading}
        onClose={closeReposModal}
      />

      {/* App Settings Modal (AI + About & Updates) */}
      <AppSettingsModal
        isOpen={aiConfigModalOpen}
        initialTab={settingsTab}
        currentConfig={aiConfig}
        showCommitBody={showCommitBody}
        onToggleShowCommitBody={handleToggleShowCommitBody}
        onSaveAiConfig={saveAiConfig}
        onClose={closeAiConfigModal}
        updateStatus={appUpdateStatus}
        updateObj={appUpdateObj}
        manualRelease={appManualRelease}
        updateProgress={appUpdateProgress}
        updateError={appUpdateError}
        onCheckForUpdates={checkAppForUpdates}
        onInstallUpdate={installAppUpdate}
      />

      {/* 3-Way Merge Conflict Resolver Modal */}
      <ConflictResolverModal
        isOpen={conflictModalOpen}
        conflict={selectedConflict}
        loading={conflictLoading}
        onResolve={resolveConflict}
        onClose={closeConflictModal}
      />

      {/* Drag & Drop Branch Merge / Rebase / Pull / Push Modal */}
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

      {/* Branch Right-Click Context Menu */}
      <BranchContextMenu
        state={contextMenuState}
        currentBranch={currentBranchName}
        remoteUrl={summary?.remote_url}
        hasUncommittedChanges={hasUncommittedChanges}
        onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCheckout={(branchName) => checkoutBranch(branchName)}
        onMerge={(branchName) => mergeBranch(branchName, currentBranchName)}
        onRebase={(branchName) => rebaseBranch(branchName)}
        onRename={(oldName, newName) => renameBranch(oldName, newName)}
        onDelete={(branchName) => deleteBranch(branchName)}
        onCreateBranchHere={(_commitOid, _baseBranch) => {
          setBranchModalOpen(true);
        }}
        onCreateTagHere={(commitOid) => {
          setTargetCommitForTag({ oid: commitOid });
          setCreateTagModalOpen(true);
        }}
        onStartPullRequest={(branchName) => {
          handleOpenPullRequest(branchName);
        }}
        onPull={() => pullRemote()}
        onPush={() => pushRemote()}
      />

      {/* Commit Right-Click Context Menu */}
      <CommitContextMenu
        state={commitContextMenuState}
        remoteUrl={summary?.remote_url}
        isHead={commitContextMenuState.commit?.oid === summary?.head_commit_oid}
        onClose={() => setCommitContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCreateTag={(commit) => {
          setTargetCommitForTag({ oid: commit.oid, summary: commit.summary });
          setCreateTagModalOpen(true);
        }}
        onCreateBranch={(_commit) => {
          setBranchModalOpen(true);
        }}
        onUndoCommit={handleOpenUndoCommit}
      />

      {/* File Right-Click Context Menu (Flechas 2 y 3) */}
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

      {/* Destructive Action Confirmation: Restore Commit File */}
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

      {/* Pull Request Creator Modal with AI Assistance */}
      <CreatePullRequestModal
        isOpen={pullRequestModalOpen}
        repoPath={activeRepoPath}
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

      {/* Pull Request Hub Modal (Review, Checks & Native Merge) */}
      <PullRequestHubModal
        isOpen={prHubOpen}
        repoPath={activeRepoPath}
        remoteUrl={summary?.remote_url}
        currentUser={githubUser}
        initialPrNumber={hubSelectedPrNumber}
        onClose={() => {
          setPrHubOpen(false);
          setHubSelectedPrNumber(null);
          refreshPrCount();
        }}
      />

      {/* GitHub Actions Hub Modal */}
      <ActionsHubModal
        isOpen={actionsHubOpen}
        remoteUrl={summary?.remote_url}
        onClose={() => setActionsHubOpen(false)}
      />

      {/* Release Wizard Modal (Exclusive for Git-Manager Repo) */}
      <ReleaseWizardModal
        isOpen={releaseWizardOpen}
        repoPath={activeRepoPath}
        currentBranch={summary?.current_branch}
        openPrCount={openPrCount}
        activeRunsCount={effectiveActiveRunsCount}
        hasUncommittedChanges={hasUncommittedChanges}
        uncommittedChangesCount={stagedFiles.length + unstagedFiles.length}
        onClose={() => setReleaseWizardOpen(false)}
        onReleaseStart={() => setIsReleaseTriggered(true)}
        onReleaseError={() => setIsReleaseTriggered(false)}
        onReleaseSuccess={handleReleaseSuccess}
      />

      {/* Open / Clone Repository Modal */}
      <OpenRepoModal
        isOpen={openRepoModalOpen}
        recentRepos={recentRepos}
        gitHubRepos={repositories}
        gitHubUser={githubUser}
        onClose={() => setOpenRepoModalOpen(false)}
        onOpenRepo={openTab}
        onClearRecent={clearRecentRepos}
      />

      {/* Undo Last Commit Modal */}
      <UndoCommitModal
        isOpen={undoCommitModalOpen}
        commit={commitToUndo}
        onClose={() => {
          setUndoCommitModalOpen(false);
          setCommitToUndo(null);
        }}
        onConfirm={handleConfirmUndoCommit}
      />

      {/* Discard Unstaged Changes Modal */}
      <DiscardChangesModal
        isOpen={discardModalOpen}
        target={discardTarget}
        onClose={() => {
          setDiscardModalOpen(false);
          setDiscardTarget(null);
        }}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
};

export default App;
