import React, { useState } from "react";
import {
  Plus,
  X,
  Bell,
  Settings,
  LogOut,
  Cloud,
  ChevronDown,
  FolderGit2,
} from "lucide-react";
import { RepoTab } from "../../hooks/useRepoTabs";
import { GitHubUser } from "../../types/git";

interface RepoTabBarProps {
  tabs: RepoTab[];
  activeTabId: string;
  user: GitHubUser | null;
  notificationCount?: number;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenNewTab: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenRepos: () => void;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
}

export const RepoTabBar: React.FC<RepoTabBarProps> = ({
  tabs,
  activeTabId,
  user,
  notificationCount = 0,
  onSwitchTab,
  onCloseTab,
  onOpenNewTab,
  onOpenAuth,
  onLogout,
  onOpenRepos,
  onOpenSettings,
  onOpenNotifications,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-2 select-none shrink-0 gap-2 z-40">
      {/* Left side: List of open project tabs + Add Tab Button */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasPendingChanges = typeof tab.pendingChanges === "number" && tab.pendingChanges > 0;

          return (
            <div
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`group relative flex items-center gap-2 h-7 px-3 rounded-t text-xs cursor-pointer transition-all max-w-[200px] border-t-2 shrink-0 ${
                isActive
                  ? "bg-[#0d1117] text-white font-medium border-t-blue-500 border-x border-[#30363d] shadow-sm z-10"
                  : "bg-[#161b22] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] border-t-transparent"
              }`}
              title={`${tab.name} (${tab.path})`}
            >
              {tab.customIcon ? (
                <img
                  src={tab.customIcon}
                  alt=""
                  className="w-4 h-4 shrink-0 object-contain"
                />
              ) : (
                <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-blue-400 group-hover:text-blue-300 transition-colors" />
              )}

              <span className="truncate font-sans text-xs">{tab.name}</span>

              {/* Pending uncommitted changes counter (only shown if > 0) */}
              {hasPendingChanges && (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0"
                  title={`${tab.pendingChanges} cambio(s) pendientes de commit`}
                >
                  {tab.pendingChanges}
                </span>
              )}

              {/* Close Tab Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-[#30363d] hover:text-white transition-colors shrink-0 ml-1 ${
                  isActive ? "text-[#8b949e]" : "opacity-0 group-hover:opacity-100 text-[#484f58]"
                }`}
                title="Cerrar pestaña"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={onOpenNewTab}
          className="flex items-center justify-center h-6 w-6 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors ml-1 shrink-0"
          title="Abrir o clonar nuevo repositorio..."
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Right side: Notifications Bell, Settings Gear & User Profile (Flechas 2 y 7) */}
      <div className="flex items-center gap-1.5 shrink-0 relative">
        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors relative"
          title="Notificaciones"
        >
          <Bell className="w-3.5 h-3.5" />
          {notificationCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
          )}
        </button>

        {/* App Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          title="Ajustes de la aplicación y Asistente IA"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-[#30363d] mx-0.5" />

        {/* GitHub User Profile / Login */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 rounded-full hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors text-xs text-[#c9d1d9] group"
              title={`Sesión iniciada como @${user.login}`}
            >
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-4.5 h-4.5 rounded-full border border-blue-500/50 object-cover"
              />
              <span className="text-white font-mono text-[11px] font-medium hidden sm:inline max-w-[100px] truncate">
                @{user.login}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8b949e] group-hover:text-white transition-transform" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-[#30363d]/70 flex items-center gap-2">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="w-7 h-7 rounded-full border border-blue-500/50 object-cover"
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-white font-semibold text-xs truncate">
                      {user.name || user.login}
                    </span>
                    <span className="text-[#8b949e] font-mono text-[10px] truncate">
                      @{user.login}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onOpenRepos}
                  className="w-full text-left px-3 py-2 hover:bg-[#21262d] flex items-center gap-2 text-[#c9d1d9] hover:text-white transition-colors"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ver Repositorios de GitHub</span>
                </button>

                <div className="h-[1px] bg-[#30363d]/50 my-1" />

                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] transition-colors"
          >
            <span>Conectar GitHub</span>
          </button>
        )}
      </div>
    </div>
  );
};
