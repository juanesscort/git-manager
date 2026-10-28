import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RepoSummary } from "../types/git";

export interface RepoTab {
  id: string;
  name: string;
  path: string;
  currentBranch?: string | null;
}

const STORAGE_TABS_KEY = "git_manager_tabs_v1";
const STORAGE_ACTIVE_TAB_KEY = "git_manager_active_tab_id_v1";
const STORAGE_RECENT_KEY = "git_manager_recent_repos_v1";

const DEFAULT_REPO: RepoTab = {
  id: "repo-default",
  name: "git-manager",
  path: "/home/juanesscort/Proyectos/git-manager",
  currentBranch: "main",
};

export function useRepoTabs() {
  const [tabs, setTabs] = useState<RepoTab[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TABS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [DEFAULT_REPO];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY);
      if (stored) return stored;
    } catch {
      // Fallback
    }
    return DEFAULT_REPO.id;
  });

  const [recentRepos, setRecentRepos] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_RECENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [DEFAULT_REPO.path];
  });

  // Save tabs and active tab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TABS_KEY, JSON.stringify(tabs));
      localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, activeTabId);
      localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(recentRepos));
    } catch {
      // Ignore storage errors
    }
  }, [tabs, activeTabId, recentRepos]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const addRecentRepo = useCallback((path: string) => {
    setRecentRepos((prev) => {
      const filtered = prev.filter((p) => p !== path);
      return [path, ...filtered].slice(0, 10);
    });
  }, []);

  const openTab = useCallback(
    async (rawPath: string, customName?: string): Promise<{ success: boolean; error?: string }> => {
      const cleanPath = rawPath.trim();
      if (!cleanPath) return { success: false, error: "Ruta vacía" };

      try {
        // Validate that it's a real git repository
        const summary = await invoke<RepoSummary>("get_repo_info", { path: cleanPath });
        const canonicalPath = summary.path || cleanPath;

        // Check if tab already exists
        const existing = tabs.find((t) => t.path === canonicalPath);
        if (existing) {
          setActiveTabId(existing.id);
          addRecentRepo(canonicalPath);
          return { success: true };
        }

        // Derive name
        const pathParts = canonicalPath.split("/").filter(Boolean);
        const derivedName = customName || pathParts.pop() || "repo";

        const newTab: RepoTab = {
          id: `repo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: derivedName,
          path: canonicalPath,
          currentBranch: summary.current_branch,
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
        addRecentRepo(canonicalPath);
        return { success: true };
      } catch (err: unknown) {
        const errorMsg =
          typeof err === "string"
            ? err
            : err instanceof Error
            ? err.message
            : "No es un repositorio Git válido";
        return { success: false, error: errorMsg };
      }
    },
    [tabs, addRecentRepo]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          if (remaining.length > 0) {
            setActiveTabId(remaining[remaining.length - 1].id);
          } else {
            setActiveTabId("");
          }
        }
        return remaining;
      });
    },
    [activeTabId]
  );

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const updateTabBranch = useCallback((tabId: string, branchName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, currentBranch: branchName } : t))
    );
  }, []);

  const clearRecentRepos = useCallback(() => {
    setRecentRepos([]);
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    recentRepos,
    openTab,
    closeTab,
    switchTab,
    updateTabBranch,
    clearRecentRepos,
  };
}
