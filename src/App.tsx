import React, { useEffect, useState } from "react";
import {
  GitBranch,
  RefreshCw,
  FolderGit2,
  FolderPlus,
  LogOut,
  Cloud,
  FileText,
  GitGraph,
  Split,
  Maximize2,
  X,
} from "lucide-react";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Splitter } from "./components/ui/Splitter";
import { CreateBranchModal } from "./components/ui/CreateBranchModal";
import { BranchMergeModal } from "./components/ui/BranchMergeModal";
import { BranchContextMenu, BranchContextMenuState } from "./components/ui/BranchContextMenu";
import { RepoTabBar } from "./components/ui/RepoTabBar";
import { OpenRepoModal } from "./components/ui/OpenRepoModal";
import { useRepoTabs } from "./hooks/useRepoTabs";
import { GitToolbar } from "./features/git-ops/components/GitToolbar";
import { useGitToolbar } from "./hooks/useGitToolbar";
import { useRepo } from "./hooks/useRepo";
import { useStaging } from "./features/staging-area/hooks/useStaging";
import { useCommitGraph } from "./features/commit-graph/hooks/useCommitGraph";
import { useGitHub } from "./features/github-sync/hooks/useGitHub";
import { useAiAssistant } from "./features/ai-assistant/hooks/useAiAssistant";
import { useConflictResolver } from "./features/conflict-resolver/hooks/useConflictResolver";
import { StagingArea } from "./features/staging-area/components/StagingArea";
import { CommitGraph } from "./features/commit-graph/components/CommitGraph";
import { BranchTreeView } from "./features/commit-graph/components/BranchTreeView";
import { DiffViewer } from "./features/staging-area/components/DiffViewer";
import { CommitDetailsPanel } from "./features/commit-graph/components/CommitDetailsPanel";
import { useBranches } from "./features/commit-graph/hooks/useBranches";
import { useCommitDetails } from "./features/commit-graph/hooks/useCommitDetails";
import { GitHubAuthModal } from "./features/github-sync/components/GitHubAuthModal";
import { RemoteReposModal } from "./features/github-sync/components/RemoteReposModal";
import { AiConfigModal } from "./features/ai-assistant/components/AiConfigModal";
import { ConflictResolverModal } from "./features/conflict-resolver/components/ConflictResolverModal";
import { CommitInfo } from "./types/git";
import "./App.css";

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
    updateTabBranch,
    clearRecentRepos,
  } = useRepoTabs();

  const [openRepoModalOpen, setOpenRepoModalOpen] = useState<boolean>(false);
  const activeRepoPath = activeTab?.path || ".";

  const { repoPath, summary, refreshRepo } = useRepo(activeRepoPath);

  // Sync active tab's branch badge with the current summary
  useEffect(() => {
    if (summary?.current_branch && activeTabId) {
      updateTabBranch(activeTabId, summary.current_branch);
    }
  }, [summary?.current_branch, activeTabId, updateTabBranch]);

  // Resizable panel dimensions (Flechas 2, 3, 4)
  const [leftWidth, setLeftWidth] = useState<number>(230);
  const [rightWidth, setRightWidth] = useState<number>(340);
  const [diffHeight, setDiffHeight] = useState<number>(320);

  // Center Area display mode (Flecha 6)
  const [centerViewMode, setCenterViewMode] = useState<"full" | "split">("full");
  const [activeCenterTab, setActiveCenterTab] = useState<"graph" | "diff">("graph");
  const [branchModalOpen, setBranchModalOpen] = useState<boolean>(false);

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

  const {
    graphNodes,
    selectedCommit,
    loading: commitsLoading,
    setSelectedCommit,
    refreshCommits,
  } = useCommitGraph(repoPath);

  const { branches, refreshBranches } = useBranches(repoPath);

  const {
    files: commitFiles,
    loading: commitFilesLoading,
    selectedFile: commitSelectedFile,
    fileDiff: commitFileDiff,
    diffLoading: commitDiffLoading,
    selectFile: selectCommitFile,
  } = useCommitDetails(repoPath, selectedCommit);

  const {
    stagedFiles,
    unstagedFiles,
    selectedFile,
    diff,
    diffLoading,
    loading: stagingLoading,
    refreshStatuses,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    commitChanges,
    loadDiff,
    clearSelectedFile,
  } = useStaging(repoPath, () => {
    refreshCommits();
    refreshRepo();
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
  } = useConflictResolver(repoPath, () => {
    refreshStatuses();
    refreshCommits();
    refreshRepo();
  });

  useEffect(() => {
    checkConflicts();
  }, [checkConflicts, repoPath]);

  const handleRefreshAll = () => {
    refreshRepo();
    refreshStatuses();
    refreshCommits();
    checkConflicts();
    refreshBranches();
  };

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
  } = useGitToolbar(repoPath, handleRefreshAll);

  // Drag & drop branch merge state
  const [mergeModal, setMergeModal] = useState<{
    isOpen: boolean;
    sourceBranch: string;
    targetBranch: string;
    isRemote: boolean;
  }>({
    isOpen: false,
    sourceBranch: "",
    targetBranch: "",
    isRemote: false,
  });

  const handleDropBranch = (sourceBranch: string, targetBranch: string, isRemote: boolean) => {
    setMergeModal({
      isOpen: true,
      sourceBranch,
      targetBranch,
      isRemote,
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
    isRemote: boolean
  ) => {
    setContextMenuState({
      isOpen: true,
      x,
      y,
      branchName,
      isHead,
      isRemote,
    });
  };

  const hasUncommittedChanges = stagedFiles.length > 0 || unstagedFiles.length > 0;

  const currentBranchName = summary?.current_branch || "main";

  // Flecha 5: Toggle commit selection on click
  const handleSelectCommit = (commit: CommitInfo) => {
    if (selectedCommit?.oid === commit.oid) {
      setSelectedCommit(null);
      selectCommitFile("");
      setActiveCenterTab("graph");
    } else {
      setSelectedCommit(commit);
      clearSelectedFile();
    }
  };

  // Flecha 6: Central Diff Viewer resolution
  const isCommitDiffActive = selectedCommit !== null && !!commitSelectedFile;
  const isStagingDiffActive = selectedCommit === null && !!selectedFile;
  const hasActiveDiff = isCommitDiffActive || isStagingDiffActive;

  const activeDiffPath = isCommitDiffActive ? commitSelectedFile : selectedFile?.path || null;
  const activeDiff = isCommitDiffActive ? commitFileDiff : diff;
  const activeDiffLoading = isCommitDiffActive ? commitDiffLoading : diffLoading;

  // Reset commit/file selections when active tab changes
  useEffect(() => {
    setSelectedCommit(null);
    selectCommitFile("");
    clearSelectedFile();
    setActiveCenterTab("graph");
  }, [activeTabId]);

  const handleCloseDiff = () => {
    if (isCommitDiffActive) {
      selectCommitFile("");
    }
    if (isStagingDiffActive) {
      clearSelectedFile();
    }
    setActiveCenterTab("graph");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] select-none overflow-hidden">
      {/* GitKraken-Style Multi-Project Top Tab Bar */}
      <RepoTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onOpenNewTab={() => setOpenRepoModalOpen(true)}
      />

      {/* Top Navigation Bar & GitKraken Action Toolbar */}
      <header className="h-12 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h1 className="font-semibold text-white tracking-wide text-xs">Git-Manager</h1>
          </div>
          {activeTab && (
            <span className="text-[11px] font-mono text-blue-400 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded font-medium">
              {activeTab.name}
            </span>
          )}
          {summary?.current_branch && (
            <Badge
              label={summary.current_branch}
              variant="purple"
              icon={<GitBranch className="w-3 h-3 text-purple-400" />}
            />
          )}
        </div>

        {/* Flecha 1: Action Toolbar (Fetch, Pull, Push, Branch, Stash) */}
        <GitToolbar
          operating={toolbarOperating}
          activeOp={toolbarActiveOp}
          message={toolbarMessage}
          error={toolbarError}
          onFetch={fetchRemote}
          onPull={pullRemote}
          onPush={pushRemote}
          onOpenCreateBranch={() => setBranchModalOpen(true)}
          onStash={stashChanges}
          onPopStash={popStash}
          onClearNotification={clearToolbarNotification}
        />

        {/* Right Section: GitHub User & Single Unified Refresh (Flecha 8, Badges removed Flecha 7) */}
        <div className="flex items-center gap-2">
          {githubUser ? (
            <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-full py-0.5 px-2.5 text-xs">
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="w-5 h-5 rounded-full border border-blue-500/50"
              />
              <span className="text-white font-mono font-medium text-[11px]">@{githubUser.login}</span>

              <button
                onClick={fetchRepositories}
                className="text-[11px] text-blue-400 hover:text-blue-300 ml-1 flex items-center gap-1 font-sans hover:underline"
                title="Ver tus repositorios públicos y privados"
              >
                <Cloud className="w-3 h-3" />
                <span>Repositorios</span>
              </button>

              <button
                onClick={logoutGitHub}
                className="text-[#8b949e] hover:text-rose-400 p-0.5 ml-1 transition-colors"
                title="Cerrar sesión de GitHub"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={startDeviceAuth}
              className="h-7 text-xs bg-[#21262d] hover:bg-[#30363d] text-white border-[#388bfd]/40"
              icon={
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              }
            >
              Conectar con GitHub
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${stagingLoading || commitsLoading ? "animate-spin" : ""}`} />}
            onClick={handleRefreshAll}
            title="Sincronizar todo el repositorio"
            className="h-7 text-xs"
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
          {/* Left Sidebar: Navigation & Repositories */}
          <aside
            style={{ width: leftWidth }}
            className="bg-[#0d1117] flex flex-col p-3 gap-4 shrink-0 overflow-hidden select-none"
          >
            <div>
              <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
                Repositorio Local
              </span>
              <div className="mt-1.5 p-2 rounded bg-[#161b22] border border-[#30363d] text-xs">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">{activeTab?.name || "git-manager"}</span>
                </div>
                <p className="text-[#8b949e] text-[10px] truncate mt-1 font-mono">
                  {summary?.path || activeRepoPath}
                </p>
              </div>
            </div>

          <nav className="flex flex-col gap-3 text-xs overflow-y-auto">
            {/* Local Branches Section with Folders */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider mb-0.5">
                Ramas Locales ({branches.local.length})
              </span>
              <BranchTreeView
                branches={branches.local}
                currentBranch={currentBranchName}
                onContextMenu={handleOpenBranchContextMenu}
                onDropBranch={handleDropBranch}
              />
            </div>

            {/* Remote Branches Section with Folders */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#30363d]/50">
              <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider mb-0.5">
                Ramas Remotas ({branches.remote.length})
              </span>
              <BranchTreeView
                branches={branches.remote}
                isRemote={true}
                onContextMenu={handleOpenBranchContextMenu}
                onDropBranch={handleDropBranch}
              />
            </div>
          </nav>
        </aside>

        {/* Flecha 2: Resizable Left Splitter */}
        <Splitter
          direction="vertical"
          title="Arrastra para cambiar el ancho de la barra izquierda"
          onDrag={(e) => setLeftWidth(Math.min(Math.max(e.clientX, 170), 450))}
        />

        {/* Center Canvas: Commit Graph & Central Diff Viewer (Flecha 6 & Flecha 4) */}
        <main className="flex-1 flex flex-col bg-[#010409] overflow-hidden min-w-0">
          {hasActiveDiff ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Center Tab Header */}
              <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-1">
                  {/* Tab 1: Commit Graph */}
                  <button
                    onClick={() => setActiveCenterTab("graph")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeCenterTab === "graph"
                        ? "bg-[#21262d] text-white border border-[#30363d]"
                        : "text-[#8b949e] hover:text-white"
                    }`}
                  >
                    <GitGraph className="w-3.5 h-3.5 text-blue-400" />
                    <span>Grafo de Commits</span>
                  </button>

                  {/* Tab 2: Diff File Tab */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${
                      activeCenterTab === "diff"
                        ? "bg-[#1f6feb]/20 border-blue-500/50 text-white"
                        : "bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white"
                    }`}
                  >
                    <button
                      onClick={() => setActiveCenterTab("diff")}
                      className="flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono truncate max-w-xs">{activeDiffPath}</span>
                    </button>
                    <button
                      onClick={handleCloseDiff}
                      className="ml-1 p-0.5 hover:text-rose-400 rounded text-[#8b949e] transition-colors"
                      title="Cerrar diff y volver al grafo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* View Mode Controls (Split vs Fullscreen) */}
                <div className="flex items-center gap-1">
                  {centerViewMode === "full" ? (
                    <button
                      onClick={() => setCenterViewMode("split")}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
                      title="Dividir pantalla: Ver Grafo y Diff simultáneamente"
                    >
                      <Split className="w-3 h-3" />
                      <span>Dividir</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setCenterViewMode("full")}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors"
                      title="Pantalla Completa para el Diff"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Maximizar</span>
                    </button>
                  )}

                  <button
                    onClick={handleCloseDiff}
                    className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors ml-1"
                    title="Cerrar diff"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tab Content depending on Full vs Split */}
              {centerViewMode === "full" ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {activeCenterTab === "diff" ? (
                    <DiffViewer
                      diff={activeDiff}
                      loading={activeDiffLoading}
                      onClose={handleCloseDiff}
                    />
                  ) : (
                    <CommitGraph
                      nodes={graphNodes}
                      selectedCommit={selectedCommit}
                      loading={commitsLoading}
                      branches={branches}
                      githubAvatarUrl={githubUser?.avatar_url}
                      onSelectCommit={handleSelectCommit}
                      onBranchContextMenu={handleOpenBranchContextMenu}
                      onDropBranch={handleDropBranch}
                    />
                  )}
                </div>
              ) : (
                /* Split View: Commit Graph on top, Draggable Splitter, DiffViewer on bottom (Flecha 4) */
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden min-h-[120px]">
                    <CommitGraph
                      nodes={graphNodes}
                      selectedCommit={selectedCommit}
                      loading={commitsLoading}
                      branches={branches}
                      githubAvatarUrl={githubUser?.avatar_url}
                      onSelectCommit={handleSelectCommit}
                      onBranchContextMenu={handleOpenBranchContextMenu}
                      onDropBranch={handleDropBranch}
                    />
                  </div>

                  {/* Flecha 4: Horizontal Resizable Splitter */}
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
                      diff={activeDiff}
                      loading={activeDiffLoading}
                      onClose={handleCloseDiff}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Default: Full Commit Graph Canvas */
            <div className="flex-1 flex flex-col overflow-hidden">
              <CommitGraph
                nodes={graphNodes}
                selectedCommit={selectedCommit}
                loading={commitsLoading}
                branches={branches}
                githubAvatarUrl={githubUser?.avatar_url}
                onSelectCommit={handleSelectCommit}
                onBranchContextMenu={handleOpenBranchContextMenu}
                onDropBranch={handleDropBranch}
              />
            </div>
          )}
        </main>

        {/* Flecha 3: Resizable Right Splitter */}
        <Splitter
          direction="vertical"
          title="Arrastra para cambiar el ancho de la barra derecha"
          onDrag={(e) =>
            setRightWidth(Math.min(Math.max(window.innerWidth - e.clientX, 250), 600))
          }
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
              selectedFilePath={commitSelectedFile}
              onSelectFile={(path) => {
                if (commitSelectedFile === path) {
                  selectCommitFile("");
                  setActiveCenterTab("graph");
                } else {
                  selectCommitFile(path);
                  setActiveCenterTab("diff");
                }
              }}
              onClose={() => {
                setSelectedCommit(null);
                selectCommitFile("");
                setActiveCenterTab("graph");
              }}
            />
          ) : (
            <StagingArea
              stagedFiles={stagedFiles}
              unstagedFiles={unstagedFiles}
              conflictedFiles={conflictedFiles}
              selectedFile={selectedFile}
              currentBranch={currentBranchName}
              loading={stagingLoading}
              aiGenerating={aiGenerating}
              onRefresh={() => {
                refreshStatuses();
                checkConflicts();
              }}
              onStageFile={stageFile}
              onUnstageFile={unstageFile}
              onStageAll={stageAll}
              onUnstageAll={unstageAll}
              onSelectFile={(path, staged) => {
                if (!path) {
                  clearSelectedFile();
                  setActiveCenterTab("graph");
                } else {
                  loadDiff(path, staged);
                  setActiveCenterTab("diff");
                }
              }}
              onCommit={commitChanges}
              onGenerateAiCommit={() => generateCommit(activeRepoPath)}
              onOpenAiConfig={openAiConfigModal}
              onOpenConflictResolver={openConflictModal}
            />
          )}
        </div>
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

      {/* AI Assistant Configuration Modal */}
      <AiConfigModal
        isOpen={aiConfigModalOpen}
        currentConfig={aiConfig}
        onSave={saveAiConfig}
        onClose={closeAiConfigModal}
      />

      {/* 3-Way Merge Conflict Resolver Modal */}
      <ConflictResolverModal
        isOpen={conflictModalOpen}
        conflict={selectedConflict}
        loading={conflictLoading}
        onResolve={resolveConflict}
        onClose={closeConflictModal}
      />

      {/* Drag & Drop Branch Merge / Rebase / Pull Modal */}
      <BranchMergeModal
        isOpen={mergeModal.isOpen}
        sourceBranch={mergeModal.sourceBranch}
        targetBranch={mergeModal.targetBranch}
        isRemote={mergeModal.isRemote}
        onClose={() => setMergeModal((prev) => ({ ...prev, isOpen: false }))}
        onMerge={(source) => mergeBranch(source)}
        onRebase={(source) => rebaseBranch(source)}
        onPull={() => pullRemote()}
      />

      {/* Branch Right-Click Context Menu */}
      <BranchContextMenu
        state={contextMenuState}
        currentBranch={currentBranchName}
        hasUncommittedChanges={hasUncommittedChanges}
        onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
        onCheckout={(branchName) => checkoutBranch(branchName)}
        onMerge={(branchName) => mergeBranch(branchName)}
        onRebase={(branchName) => rebaseBranch(branchName)}
        onRename={(oldName, newName) => renameBranch(oldName, newName)}
        onDelete={(branchName) => deleteBranch(branchName)}
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
    </div>
  );
};

export default App;
