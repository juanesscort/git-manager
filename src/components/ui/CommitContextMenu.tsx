import React, { useEffect, useRef, useState } from "react";
import { Tag, GitBranch, Copy, Check, ExternalLink, GitCommit, Undo2 } from "lucide-react";
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
  isHead?: boolean;
  onClose: () => void;
  onCreateTag: (commit: CommitInfo) => void;
  onCreateBranch: (commit: CommitInfo) => void;
  onUndoCommit?: (commit: CommitInfo) => void;
}

export const CommitContextMenu: React.FC<CommitContextMenuProps> = ({
  state,
  remoteUrl,
  isHead = false,
  onClose,
  onCreateTag,
  onCreateBranch,
  onUndoCommit,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const commit = state.commit;
  const commitOid = commit?.oid;

  // Resolve GitHub commit URL unconditionally at the top
  const githubCommitUrl = React.useMemo(() => {
    if (!remoteUrl || !commitOid) return null;
    let clean = remoteUrl.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "https://github.com/");
    }
    clean = clean.replace(/\.git$/, "");
    return `${clean}/commit/${commitOid}`;
  }, [remoteUrl, commitOid]);

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

  // Early return after all hooks have been declared
  if (!state.isOpen || !commit) return null;

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
  const adjustedX = Math.max(10, Math.min(state.x, window.innerWidth - menuWidth - 10));
  const adjustedY = Math.max(10, Math.min(state.y, window.innerHeight - menuHeight - 10));

  const shortOid = commit.short_oid || commit.oid.substring(0, 7);
  const authorName = commit.author_name || "Desconocido";
  const commitSummary = commit.summary || "";

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
          <span>{shortOid}</span>
        </div>
        <span className="text-[10px] text-[#8b949e] font-sans truncate max-w-[120px]">
          {authorName}
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

      {/* Section 1.5: Undo Last Commit (Only for HEAD) */}
      {isHead && onUndoCommit && (
        <div className="py-1">
          <button
            onClick={() => {
              onUndoCommit(commit);
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Deshacer este commit (Undo)...</span>
          </button>
        </div>
      )}

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
          onClick={() => handleCopy(shortOid, "short-sha")}
          className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          {copiedType === "short-sha" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
          )}
          <span>{copiedType === "short-sha" ? "¡SHA corto copiado!" : `Copiar SHA (${shortOid})`}</span>
        </button>

        <button
          onClick={() => handleCopy(commitSummary, "summary")}
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
