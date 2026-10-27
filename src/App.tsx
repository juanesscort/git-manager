import React from "react";
import { GitBranch, ShieldCheck, RefreshCw, FolderGit2, GitFork } from "lucide-react";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { useRepo } from "./hooks/useRepo";
import { useStaging } from "./features/staging-area/hooks/useStaging";
import { useCommitGraph } from "./features/commit-graph/hooks/useCommitGraph";
import { StagingArea } from "./features/staging-area/components/StagingArea";
import { CommitGraph } from "./features/commit-graph/components/CommitGraph";
import { DiffViewer } from "./features/staging-area/components/DiffViewer";
import "./App.css";

export const App: React.FC = () => {
  const { repoPath, summary, refreshRepo } = useRepo(".");

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

  const handleRefreshAll = () => {
    refreshRepo();
    refreshStatuses();
    refreshCommits();
  };

  const currentBranchName = summary?.current_branch || "main";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] select-none overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-11 border-b border-[#30363d] bg-[#161b22] px-3 flex items-center justify-between shrink-0">
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
          <Badge
            label="Motor libgit2 Activo"
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
            <div className="flex items-center gap-1.5 text-[#58a6ff]">
              <GitFork className="w-3.5 h-3.5" />
              <span>Grafo: Fase 2 (Activo)</span>
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

          {/* Bottom Diff Viewer Drawer (Opens when a file is selected) */}
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
          selectedFile={selectedFile}
          currentBranch={currentBranchName}
          loading={stagingLoading}
          onRefresh={refreshStatuses}
          onStageFile={stageFile}
          onUnstageFile={unstageFile}
          onStageAll={stageAll}
          onUnstageAll={unstageAll}
          onSelectFile={(path, staged) => loadDiff(path, staged)}
          onCommit={commitChanges}
        />
      </div>
    </div>
  );
};

export default App;
