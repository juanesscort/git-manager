import React, { useEffect } from "react";
import { GitBranch, ShieldCheck, RefreshCw, FolderGit2, GitFork, LogOut, Cloud, Sparkles, GitMerge } from "lucide-react";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { useRepo } from "./hooks/useRepo";
import { useStaging } from "./features/staging-area/hooks/useStaging";
import { useCommitGraph } from "./features/commit-graph/hooks/useCommitGraph";
import { useGitHub } from "./features/github-sync/hooks/useGitHub";
import { useAiAssistant } from "./features/ai-assistant/hooks/useAiAssistant";
import { useConflictResolver } from "./features/conflict-resolver/hooks/useConflictResolver";
import { StagingArea } from "./features/staging-area/components/StagingArea";
import { CommitGraph } from "./features/commit-graph/components/CommitGraph";
import { DiffViewer } from "./features/staging-area/components/DiffViewer";
import { GitHubAuthModal } from "./features/github-sync/components/GitHubAuthModal";
import { RemoteReposModal } from "./features/github-sync/components/RemoteReposModal";
import { AiConfigModal } from "./features/ai-assistant/components/AiConfigModal";
import { ConflictResolverModal } from "./features/conflict-resolver/components/ConflictResolverModal";
import "./App.css";

export const App: React.FC = () => {
  const { repoPath, summary, refreshRepo } = useRepo(".");

  const {
    user: githubUser,
    deviceAuth,
    authModalOpen,
    reposModalOpen,
    repositories,
    reposLoading,
    startDeviceAuth,
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
  };

  const currentBranchName = summary?.current_branch || "main";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] select-none overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h1 className="font-semibold text-white tracking-wide text-xs">Git-Manager</h1>
          </div>
          <Badge label="Linux Nativo" variant="blue" />
          {summary?.current_branch && (
            <Badge
              label={summary.current_branch}
              variant="purple"
              icon={<GitBranch className="w-3 h-3 text-purple-400" />}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* GitHub Integration Status */}
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

          {/* AI Config Pill */}
          <button
            onClick={openAiConfigModal}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40 transition-colors"
            title="Configurar IA"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="capitalize">{aiConfig?.provider || "Gemini"}</span>
          </button>

          <Badge
            label="Motor libgit2"
            variant="green"
            icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          />

          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${stagingLoading || commitsLoading ? "animate-spin" : ""}`} />}
            onClick={handleRefreshAll}
            title="Sincronizar todo"
            className="h-7 text-xs"
          >
            Sincronizar
          </Button>
        </div>
      </header>

      {/* Main 3-Column Studio Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Navigation & Repositories */}
        <aside className="w-56 border-r border-[#30363d] bg-[#0d1117] flex flex-col p-3 gap-4 shrink-0">
          <div>
            <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
              Repositorio Local
            </span>
            <div className="mt-1.5 p-2 rounded bg-[#161b22] border border-[#30363d] text-xs">
              <div className="flex items-center gap-1.5 text-white font-medium">
                <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">git-manager</span>
              </div>
              <p className="text-[#8b949e] text-[10px] truncate mt-1 font-mono">
                {summary?.path || "/home/juanesscort/Proyectos/git-manager"}
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider mb-1">
              Ramas Locales
            </span>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1f6feb]/20 text-white font-medium border border-blue-600/30">
              <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{currentBranchName}</span>
              <span className="ml-auto text-[9px] bg-blue-500/20 px-1 py-0.2 rounded text-blue-300 font-mono">
                HEAD
              </span>
            </div>
          </nav>

          <div className="mt-auto border-t border-[#30363d] pt-3 flex flex-col gap-1 text-[11px] text-[#8b949e]">
            <div className="flex items-center gap-1.5 text-purple-400">
              <GitMerge className="w-3.5 h-3.5" />
              <span>3-Way Merge: Fase 5 (Activo)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>IA Commits: Fase 4</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <GitFork className="w-3.5 h-3.5" />
              <span>GitHub OAuth: Fase 3</span>
            </div>
          </div>
        </aside>

        {/* Center: Interactive Commit Graph Area & Diff Viewer Drawer */}
        <main className="flex-1 flex flex-col bg-[#010409] overflow-hidden">
          {/* Commit Graph */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <CommitGraph
              nodes={graphNodes}
              selectedCommit={selectedCommit}
              loading={commitsLoading}
              onSelectCommit={setSelectedCommit}
            />
          </div>

          {/* Bottom Diff Viewer Drawer */}
          {selectedFile && (
            <div className="h-64 flex flex-col shrink-0 border-t border-[#30363d] shadow-2xl">
              <DiffViewer diff={diff} loading={diffLoading} onClose={clearSelectedFile} />
            </div>
          )}
        </main>

        {/* Right Sidebar: Staging Area */}
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
          onSelectFile={(path, staged) => loadDiff(path, staged)}
          onCommit={commitChanges}
          onGenerateAiCommit={() => generateCommit(repoPath)}
          onOpenAiConfig={openAiConfigModal}
          onOpenConflictResolver={openConflictModal}
        />
      </div>

      {/* GitHub Authentication Modal */}
      <GitHubAuthModal
        isOpen={authModalOpen}
        deviceAuth={deviceAuth}
        user={githubUser}
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
    </div>
  );
};

export default App;
