import React, { useEffect, useState } from "react";
import { FolderGit2, FolderPlus } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "./components/ui/Button";
import { RepoTabBar } from "./components/ui/RepoTabBar";
import { OpenRepoModal } from "./components/ui/OpenRepoModal";
import { GitHubAuthModal } from "./features/github-sync/components/GitHubAuthModal";
import { RemoteReposModal } from "./features/github-sync/components/RemoteReposModal";
import { AppSettingsModal } from "./components/ui/AppSettingsModal";
import { RepoWorkspace } from "./features/workspace/components/RepoWorkspace";
import { useRepoTabs } from "./hooks/useRepoTabs";
import { useGitHub } from "./features/github-sync/hooks/useGitHub";
import { useAppUpdater } from "./hooks/useAppUpdater";
import { useAiAssistant } from "./features/ai-assistant/hooks/useAiAssistant";
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
    reorderTabs,
    updateTabBranch,
    setRepoPathChanges,
    clearRecentRepos,
  } = useRepoTabs();

  const [openRepoModalOpen, setOpenRepoModalOpen] = useState<boolean>(false);

  // GitHub Auth & Repositories
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

  // AI Assistant Global Settings
  const {
    config: aiConfig,
    configModalOpen: aiConfigModalOpen,
    saveConfig: saveAiConfig,
    openConfigModal: openAiConfigModal,
    closeConfigModal: closeAiConfigModal,
  } = useAiAssistant();

  const [settingsTab, setSettingsTab] = useState<"ai" | "about">("ai");

  const [showCommitBody, setShowCommitBody] = useState<boolean>(() => {
    return localStorage.getItem("gitmanager_show_commit_body") === "true";
  });

  const handleToggleShowCommitBody = (show: boolean) => {
    setShowCommitBody(show);
    localStorage.setItem("gitmanager_show_commit_body", show ? "true" : "false");
  };

  const handleOpenSettings = (tab: "ai" | "about" = "ai") => {
    setSettingsTab(tab);
    openAiConfigModal();
  };

  // Application Updater Hook
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
    checkAppForUpdates();
  }, [checkAppForUpdates]);

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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d1117] text-[#c9d1d9] select-none overflow-hidden">
      {/* GitKraken-Style Multi-Project Top Tab Bar with User Profile on Right */}
      <RepoTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        user={githubUser}
        hasUpdate={hasAppUpdate}
        updateVersion={appUpdateVersion}
        onOpenUpdates={() => handleOpenSettings("about")}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onReorderTabs={reorderTabs}
        onOpenNewTab={() => setOpenRepoModalOpen(true)}
        onOpenAuth={startDeviceAuth}
        onLogout={logoutGitHub}
        onOpenRepos={fetchRepositories}
        onOpenSettings={() => handleOpenSettings("ai")}
      />

      {/* Main Studio: Empty Workspace vs Isolated Multi-Repo Workspaces */}
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
                      className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-blue-500/60 hover:text-white text-xs text-[#8b949e] transition-all flex items-center gap-1.5 font-mono cursor-pointer"
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
        /* Isolated Multi-Tab Workspace Containers (Docker / Browser Tab Isolation Pattern) */
        <div className="flex-1 relative overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`absolute inset-0 flex flex-col ${
                tab.id === activeTabId ? "visible z-10" : "invisible -z-10 pointer-events-none"
              }`}
            >
              <RepoWorkspace
                tabId={tab.id}
                tabName={tab.name}
                repoPath={tab.path}
                isActive={tab.id === activeTabId}
                user={githubUser}
                onUpdateBranch={(branch) => updateTabBranch(tab.id, branch)}
                onUpdatePendingChanges={(count) => setRepoPathChanges(tab.path, count)}
                onOpenSettings={(subTab) => handleOpenSettings(subTab)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Global Modals: App Settings, Auth, Remote Repos, Open Repo */}
      <OpenRepoModal
        isOpen={openRepoModalOpen}
        recentRepos={recentRepos}
        gitHubRepos={repositories}
        gitHubUser={githubUser}
        onClose={() => setOpenRepoModalOpen(false)}
        onOpenRepo={openTab}
        onClearRecent={clearRecentRepos}
      />

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

      <RemoteReposModal
        isOpen={reposModalOpen}
        user={githubUser}
        repos={repositories}
        loading={reposLoading}
        onClose={closeReposModal}
      />

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
    </div>
  );
};

export default App;
