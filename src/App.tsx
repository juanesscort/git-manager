import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Splitter } from "./components/ui/Splitter";
import { CreateBranchModal } from "./components/ui/CreateBranchModal";
import { BranchMergeModal } from "./components/ui/BranchMergeModal";
import { BranchContextMenu, BranchContextMenuState } from "./components/ui/BranchContextMenu";
import { RepoTabBar } from "./components/ui/RepoTabBar";
import { OpenRepoModal } from "./components/ui/OpenRepoModal";
import { EmbeddedTerminal } from "./components/ui/EmbeddedTerminal";
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
import { AppSettingsModal } from "./components/ui/AppSettingsModal";
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
    setRepoPathChanges,
    clearRecentRepos,
  } = useRepoTabs();

  const [openRepoModalOpen, setOpenRepoModalOpen] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
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

  const [settingsTab, setSettingsTab] = useState<"ai" | "about">("ai");

  const handleOpenSettings = (tab: "ai" | "about" = "ai") => {
    setSettingsTab(tab);
    openAiConfigModal();
  };

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

  // Keep each repository's pending changes counter updated without leaking between tabs (Flecha 5)
  const pendingChangesCount = stagedFiles.length + unstagedFiles.length;
  useEffect(() => {
    if (!stagingLoading && repoPath && activeTab?.path === repoPath) {
      setRepoPathChanges(repoPath, pendingChangesCount);
    }
  }, [stagingLoading, repoPath, activeTab?.path, pendingChangesCount, setRepoPathChanges]);

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
      {/* GitKraken-Style Multi-Project Top Tab Bar with User Profile on Right */}
      <RepoTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        user={githubUser}
        notificationCount={toolbarMessage || toolbarError ? 1 : 0}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onOpenNewTab={() => setOpenRepoModalOpen(true)}
        onOpenAuth={startDeviceAuth}
        onLogout={logoutGitHub}
        onOpenRepos={fetchRepositories}
        onOpenSettings={() => handleOpenSettings("ai")}
        onOpenNotifications={() => {}}
      />

      {/* Top Navigation Bar & GitKraken Action Toolbar */}
      <header className="h-14 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          {/* Logo & Application Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-[1px] shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#161b22] rounded-[7px] flex items-center justify-center">
                <FolderGit2 className="w-4 h-4 text-blue-400" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-white via-[#c9d1d9] to-blue-300 bg-clip-text text-transparent">
                  Git-Manager
                </h1>
                <button
                  type="button"
                  onClick={() => handleOpenSettings("about")}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] hover:text-blue-300 hover:border-blue-500/40 border border-[#30363d] cursor-pointer transition-all"
                  title="Git-Manager v0.1.0 (clic para ver actualizaciones y acerca de)"
                >
                  v0.1.0
                </button>
                <span className="text-[#484f58] font-thin">/</span>
                {activeTab && (
                  <span className="text-xs font-semibold text-blue-400 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
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
              {/* Project Path directly underneath (Flecha 3) */}
              <p
                className="text-[10px] text-[#8b949e] font-mono truncate max-w-sm hover:text-white transition-colors cursor-default"
                title={`Ruta del proyecto: ${activeRepoPath}`}
              >
                {activeRepoPath}
              </p>
            </div>
          </div>
        </div>

        {/* Flecha 6: Vertical GitKraken Action Toolbar with Terminal button */}
        <GitToolbar
          operating={toolbarOperating}
          activeOp={toolbarActiveOp}
          message={toolbarMessage}
          error={toolbarError}
          isTerminalOpen={isTerminalOpen}
          onFetch={fetchRemote}
          onPull={pullRemote}
          onPush={pushRemote}
          onOpenCreateBranch={() => setBranchModalOpen(true)}
          onStash={stashChanges}
          onPopStash={popStash}
          onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
          onClearNotification={clearToolbarNotification}
        />

        {/* Right Section: Single Unified Refresh */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${stagingLoading || commitsLoading ? "animate-spin" : ""}`} />}
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
          {/* Left Sidebar: Navigation & Repositories */}
          <aside
            style={{ width: leftWidth }}
            className="bg-[#0d1117] flex flex-col p-3 gap-3 shrink-0 overflow-hidden select-none"
          >
            <nav className="flex flex-col gap-3 text-xs overflow-y-auto flex-1">
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
                      githubLogin={githubUser?.login}
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
                      githubLogin={githubUser?.login}
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
                githubLogin={githubUser?.login}
                onSelectCommit={handleSelectCommit}
                onBranchContextMenu={handleOpenBranchContextMenu}
                onDropBranch={handleDropBranch}
              />
            </div>
          )}

          {/* Flecha 1: Embedded Linux Terminal Panel */}
          <EmbeddedTerminal
            repoPath={activeRepoPath}
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
          />
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

      {/* App Settings Modal (AI + About & Updates) */}
      <AppSettingsModal
        isOpen={aiConfigModalOpen}
        initialTab={settingsTab}
        currentConfig={aiConfig}
        onSaveAiConfig={saveAiConfig}
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

      {/* Drag & Drop Branch Merge / Rebase / Pull / Push Modal */}
      <BranchMergeModal
        isOpen={mergeModal.isOpen}
        sourceBranch={mergeModal.sourceBranch}
        targetBranch={mergeModal.targetBranch}
        sourceIsRemote={mergeModal.sourceIsRemote}
        targetIsRemote={mergeModal.targetIsRemote}
        onClose={() => setMergeModal((prev) => ({ ...prev, isOpen: false }))}
        onMerge={(source) => mergeBranch(source)}
        onRebase={(source) => rebaseBranch(source)}
        onPull={() => pullRemote()}
        onPush={() => pushRemote()}
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
