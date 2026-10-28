import React from "react";
import { FolderGit2, GitBranch, Plus, X } from "lucide-react";
import { RepoTab } from "../../hooks/useRepoTabs";

interface RepoTabBarProps {
  tabs: RepoTab[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenNewTab: () => void;
}

export const RepoTabBar: React.FC<RepoTabBarProps> = ({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onOpenNewTab,
}) => {
  return (
    <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center px-2 select-none shrink-0 overflow-x-auto no-scrollbar gap-1">
      {/* List of open project tabs */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            onClick={() => onSwitchTab(tab.id)}
            className={`group relative flex items-center gap-2 h-7 px-3 rounded-t text-xs cursor-pointer transition-all max-w-[200px] border-t-2 ${
              isActive
                ? "bg-[#0d1117] text-white font-medium border-t-blue-500 border-x border-[#30363d] shadow-sm z-10"
                : "bg-[#161b22] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] border-t-transparent"
            }`}
            title={`${tab.name} (${tab.path})`}
          >
            <FolderGit2
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? "text-blue-400" : "text-[#8b949e] group-hover:text-blue-400"
              }`}
            />

            <span className="truncate font-sans text-xs">{tab.name}</span>

            {tab.currentBranch && (
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5 ${
                  isActive
                    ? "bg-purple-950/60 text-purple-300 border border-purple-500/40"
                    : "bg-[#21262d] text-[#8b949e]"
                }`}
              >
                <GitBranch className="w-2.5 h-2.5" />
                <span className="truncate max-w-[60px]">{tab.currentBranch}</span>
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
        className="flex items-center justify-center h-6 w-6 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors ml-1"
        title="Abrir o clonar nuevo repositorio..."
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
