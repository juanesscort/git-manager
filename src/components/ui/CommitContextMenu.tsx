import React, { useEffect, useRef, useState } from "react";
import { Tag, GitBranch, Copy, Check, ExternalLink, GitCommit } from "lucide-react";
import { CommitInfo } from "../../types/git";
import { openUrl } from "@tauri-apps/plugin-opener";

export interface CommitContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  commit: CommitInfo | null;
}

interface CommitContextMenuProps {
  state: CommitContextMenuState;
  remoteUrl?: string | null;
  onClose: () => void;
  onCreateTag: (commit: CommitInfo) => void;
  onCreateBranch: (commit: CommitInfo) => void;
}

export const CommitContextMenu: React.FC<CommitContextMenuProps> = ({
  state,
  remoteUrl,
  onClose,
  onCreateTag,
  onCreateBranch,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

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

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen || !state.commit) return null;

  const commit = state.commit;

  // Resolve GitHub commit URL
  const githubCommitUrl = React.useMemo(() => {
    if (!remoteUrl) return null;
    let clean = remoteUrl.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "https://github.com/");
    }
    clean = clean.replace(/\.git$/, "");
    return `${clean}/commit/${commit.oid}`;
  }, [remoteUrl, commit.oid]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      onClose();
    }, 700);
  };

  const handleOpenGitHub = async () => {
    if (githubCommitUrl) {
      try {
        await openUrl(githubCommitUrl);
      } catch {
        window.open(githubCommitUrl, "_blank");
      }
    }
    onClose();
  };

  const menuWidth = 240;
  const menuHeight = 220;
  const adjustedX = Math.min(state.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(state.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-60 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl py-1 text-xs select-none animate-in fade-in duration-100 font-sans divide-y divide-[#30363d]/60"
    >
      {/* Header Info */}
      <div className="px-3 py-1.5 bg-[#0d1117]/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-white font-bold">
          <GitCommit className="w-3.5 h-3.5 text-purple-400" />
          <span>{commit.short_oid}</span>
        </div>
        <span className="text-[10px] text-[#8b949e] font-sans truncate max-w-[120px]">
          {commit.author_name}
        </span>
      </div>

      {/* Section 1: Create Tag & Branch */}
      <div className="py-1">
        <button
          onClick={() => {
            onCreateTag(commit);
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Crear etiqueta (Tag) en este commit...</span>
        </button>

        <button
          onClick={() => {
            onCreateBranch(commit);
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Crear nueva rama aquí...</span>
        </button>
      </div>

      {/* Section 2: Copy Actions */}
      <div className="py-1">
        <button
          onClick={() => handleCopy(commit.oid, "full-sha")}
          className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          {copiedType === "full-sha" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          )}
          <span>{copiedType === "full-sha" ? "¡SHA copiado!" : "Copiar SHA completo"}</span>
        </button>

        <button
          onClick={() => handleCopy(commit.short_oid, "short-sha")}
          className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          {copiedType === "short-sha" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
          )}
          <span>{copiedType === "short-sha" ? "¡SHA corto copiado!" : `Copiar SHA (${commit.short_oid})`}</span>
        </button>

        <button
          onClick={() => handleCopy(commit.summary, "summary")}
          className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          {copiedType === "summary" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
          )}
          <span>{copiedType === "summary" ? "¡Mensaje copiado!" : "Copiar mensaje del commit"}</span>
        </button>
      </div>

      {/* Section 3: Open on GitHub */}
      {githubCommitUrl && (
        <div className="py-1">
          <button
            onClick={handleOpenGitHub}
            className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Ver commit en GitHub</span>
          </button>
        </div>
      )}
    </div>
  );
};
