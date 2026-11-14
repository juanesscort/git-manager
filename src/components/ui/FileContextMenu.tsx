import React, { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  ExternalLink,
  Copy,
  Check,
  FileText,
  X,
  History,
  Plus,
  Minus,
  Undo2,
  GitMerge,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

export interface FileContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  relativePath: string;
  repoPath: string;
  source: "tab" | "diff_header" | "commit_file" | "wip_unstaged" | "wip_staged";
  tabId?: string;
  commitOid?: string;
  isConflicted?: boolean;
  isUntracked?: boolean;
}

interface FileContextMenuProps {
  state: FileContextMenuState;
  onClose: () => void;
  onCloseTab?: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onFilterHistory?: (path: string) => void;
  onStageFile?: (path: string) => void;
  onUnstageFile?: (path: string) => void;
  onDiscardFile?: (path: string) => void;
  onAddToGitignore?: (path: string) => void;
  onResolveConflict?: (path: string) => void;
  onRestoreCommitFile?: (commitOid: string, path: string) => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  state,
  onClose,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onFilterHistory,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  onAddToGitignore,
  onResolveConflict,
  onRestoreCommitFile,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const fullPath = state.repoPath
    ? `${state.repoPath.replace(/\/+$/, "")}/${state.relativePath.replace(/^\/+/, "")}`
    : state.relativePath;

  const fileName = state.relativePath.split("/").pop() || state.relativePath;

  // Viewport bounds collision calculation computed synchronously to avoid jump/slide animation glitches
  const menuWidth = 240;
  const menuHeight = 320;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const posX = Math.max(10, Math.min(state.x, screenWidth - menuWidth - 10));
  const posY = Math.max(10, Math.min(state.y, screenHeight - menuHeight - 10));

  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen || !state.relativePath) return null;

  const handleCopyRelative = async () => {
    try {
      await navigator.clipboard.writeText(state.relativePath);
      setCopiedType("relative");
      setTimeout(() => {
        setCopiedType(null);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error al copiar ruta relativa:", err);
    }
  };

  const handleCopyAbsolute = async () => {
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopiedType("absolute");
      setTimeout(() => {
        setCopiedType(null);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error al copiar ruta absoluta:", err);
    }
  };

  const handleRevealInFileManager = async () => {
    try {
      await revealItemInDir(fullPath);
      onClose();
    } catch (err) {
      console.error("Error al revelar archivo en el explorador:", err);
      // Fallback: open parent dir with openPath
      try {
        const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (parentDir) await openPath(parentDir);
      } catch {}
      onClose();
    }
  };

  const handleOpenInEditor = async () => {
    try {
      await openPath(fullPath);
      onClose();
    } catch (err) {
      console.error("Error al abrir archivo con aplicación externa:", err);
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 min-w-[230px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-1 text-xs text-[#c9d1d9] animate-in fade-in zoom-in-95 duration-100 select-none backdrop-blur-md"
    >
      {/* File Header Preview */}
      <div className="px-3 py-1.5 border-b border-[#30363d]/60 flex flex-col gap-0.5 bg-[#0d1117]/50">
        <span className="font-mono text-[11px] font-bold text-white truncate max-w-[210px]" title={state.relativePath}>
          {fileName}
        </span>
        <span className="text-[10px] text-[#8b949e] font-mono truncate max-w-[210px]" title={state.relativePath}>
          {state.relativePath}
        </span>
      </div>

      {/* 1. Git Specific Operations for WIP Files */}
      {state.source === "wip_unstaged" && (
        <>
          {onStageFile && (
            <button
              onClick={() => {
                onStageFile(state.relativePath);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-emerald-600/20 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Preparar archivo (Stage)</span>
            </button>
          )}

          {onDiscardFile && (
            <button
              onClick={() => {
                onDiscardFile(state.relativePath);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-rose-600/20 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Descartar cambios...</span>
            </button>
          )}

          {state.isUntracked && onAddToGitignore && (
            <button
              onClick={() => {
                onAddToGitignore(state.relativePath);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-amber-300 transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Agregar a .gitignore</span>
            </button>
          )}

          {state.isConflicted && onResolveConflict && (
            <button
              onClick={() => {
                onResolveConflict(state.relativePath);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-purple-600/20 hover:text-purple-300 transition-colors cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5 text-purple-400" />
              <span>Resolver conflicto (3-Way Merge)</span>
            </button>
          )}
          <div className="my-1 border-t border-[#30363d]/60" />
        </>
      )}

      {state.source === "wip_staged" && (
        <>
          {onUnstageFile && (
            <button
              onClick={() => {
                onUnstageFile(state.relativePath);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-amber-600/20 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 text-amber-400" />
              <span>Despreparar archivo (Unstage)</span>
            </button>
          )}

          {onDiscardFile && (
            <button
              onClick={() => {
                onDiscardFile(state.relativePath);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-rose-600/20 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Descartar cambios...</span>
            </button>
          )}
          <div className="my-1 border-t border-[#30363d]/60" />
        </>
      )}

      {/* 2. Commit File Restore Option */}
      {state.source === "commit_file" && state.commitOid && onRestoreCommitFile && (
        <>
          <button
            onClick={() => {
              if (state.commitOid) {
                onRestoreCommitFile(state.commitOid, state.relativePath);
              }
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-amber-600/20 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restaurar archivo a esta versión</span>
          </button>
          <div className="my-1 border-t border-[#30363d]/60" />
        </>
      )}

      {/* 3. System & Editor Integration */}
      <button
        onClick={handleRevealInFileManager}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
        title="Abrir en el gestor de archivos de Linux (Nautilus/Dolphin)"
      >
        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
        <span>Abrir carpeta contenedora</span>
      </button>

      <button
        onClick={handleOpenInEditor}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
        title="Abrir con el editor o aplicación predeterminada del sistema"
      >
        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
        <span>Abrir con aplicación externa...</span>
      </button>

      {/* 4. Clipboard operations */}
      <div className="my-1 border-t border-[#30363d]/60" />

      <button
        onClick={handleCopyRelative}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {copiedType === "relative" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#8b949e]" />
          )}
          <span>Copiar ruta relativa</span>
        </div>
        {copiedType === "relative" && (
          <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">¡Copiado!</span>
        )}
      </button>

      <button
        onClick={handleCopyAbsolute}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {copiedType === "absolute" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#8b949e]" />
          )}
          <span>Copiar ruta absoluta</span>
        </div>
        {copiedType === "absolute" && (
          <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">¡Copiado!</span>
        )}
      </button>

      {/* 5. History Filter in Graph */}
      {onFilterHistory && (
        <button
          onClick={() => {
            onFilterHistory(state.relativePath);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-blue-300 transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-purple-400" />
          <span>Filtrar historial de este archivo</span>
        </button>
      )}

      {/* 6. Tab Specific Management Actions */}
      {state.source === "tab" && state.tabId && (
        <>
          <div className="my-1 border-t border-[#30363d]/60" />

          {onCloseTab && (
            <button
              onClick={() => {
                if (state.tabId) onCloseTab(state.tabId);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-rose-400 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-[#8b949e]" />
              <span>Cerrar pestaña</span>
            </button>
          )}

          {onCloseOtherTabs && (
            <button
              onClick={() => {
                if (state.tabId) onCloseOtherTabs(state.tabId);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-[#8b949e]" />
              <span>Cerrar las demás pestañas</span>
            </button>
          )}

          {onCloseTabsToRight && (
            <button
              onClick={() => {
                if (state.tabId) onCloseTabsToRight(state.tabId);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#21262d] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-[#8b949e]" />
              <span>Cerrar pestañas a la derecha</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
