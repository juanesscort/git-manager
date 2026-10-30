import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  GitMerge,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  AlertTriangle,
  UploadCloud,
  DownloadCloud,
  Check,
  GitBranch,
  Tag,
  ExternalLink,
  GitPullRequest,
  Link,
  Cloud,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

export interface BranchContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  branchName: string;
  isHead: boolean;
  isRemote: boolean;
  commitOid?: string;
}

interface BranchContextMenuProps {
  state: BranchContextMenuState;
  currentBranch?: string | null;
  remoteUrl?: string | null;
  hasUncommittedChanges: boolean;
  onClose: () => void;
  onCheckout: (branchName: string) => void;
  onMerge: (branchName: string) => void;
  onRebase: (branchName: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (branchName: string) => void;
  onCreateBranchHere?: (commitOid: string, baseBranchName: string) => void;
  onCreateTagHere?: (commitOid: string) => void;
  onStartPullRequest?: (branchName: string) => void;
  onPull?: (branchName: string) => void;
  onPush?: (branchName: string) => void;
}

export const BranchContextMenu: React.FC<BranchContextMenuProps> = ({
  state,
  currentBranch,
  remoteUrl,
  hasUncommittedChanges,
  onClose,
  onCheckout,
  onMerge,
  onRebase,
  onRename,
  onDelete,
  onCreateBranchHere,
  onCreateTagHere,
  onStartPullRequest,
  onPull,
  onPush,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const cleanBranchName = state.branchName.replace(/^origin\//, "");

  // Resolve GitHub URLs
  const githubUrls = React.useMemo(() => {
    if (!remoteUrl) return null;
    let clean = remoteUrl.trim();
    if (clean.startsWith("git@github.com:")) {
      clean = clean.replace("git@github.com:", "https://github.com/");
    }
    clean = clean.replace(/\.git$/, "");
    return {
      branchUrl: `${clean}/tree/${cleanBranchName}`,
      commitUrl: state.commitOid ? `${clean}/commit/${state.commitOid}` : null,
      prUrl: `${clean}/compare/${cleanBranchName}?expand=1`,
    };
  }, [remoteUrl, cleanBranchName, state.commitOid]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!state.isOpen) {
      setShowCheckoutWarning(false);
      setShowDeleteConfirm(false);
      setShowRenamePrompt(false);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  const handleCheckoutClick = () => {
    if (state.isHead) return;
    if (hasUncommittedChanges) {
      setShowCheckoutWarning(true);
    } else {
      onCheckout(state.branchName);
      onClose();
    }
  };

  const confirmCheckoutWithChanges = () => {
    onCheckout(state.branchName);
    onClose();
  };

  const handleDeleteClick = () => {
    if (state.isHead) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(state.branchName);
    onClose();
  };

  const handleRenameClick = () => {
    setRenameValue(cleanBranchName);
    setShowRenamePrompt(true);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue.trim() !== cleanBranchName) {
      onRename(state.branchName, renameValue.trim());
    }
    onClose();
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      onClose();
    }, 700);
  };

  const handleOpenPr = async () => {
    if (githubUrls?.prUrl) {
      try {
        await openUrl(githubUrls.prUrl);
      } catch (e) {
        window.open(githubUrls.prUrl, "_blank");
      }
    }
    onClose();
  };

  // Adjust menu coordinates to stay inside viewport
  const menuWidth = 270;
  const menuHeight = 440;
  const adjustedX = Math.min(state.x, window.innerWidth - menuWidth - 15);
  const adjustedY = Math.min(state.y, window.innerHeight - menuHeight - 15);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-68 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl py-1 text-xs select-none animate-in fade-in duration-100 font-sans divide-y divide-[#30363d]/60 max-h-[85vh] overflow-y-auto"
    >
      {/* Subdialog 1: Checkout Warning with uncommitted changes */}
      {showCheckoutWarning ? (
        <div className="p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Cambios sin confirmar</span>
          </div>
          <p className="text-[11px] text-[#c9d1d9] leading-relaxed">
            Tienes archivos modificados en tu espacio de trabajo. Te recomendamos confirmar
            (Commit) o guardar en Stash antes de cambiar a{" "}
            <span className="text-white font-mono font-medium">{state.branchName}</span>.
          </p>
          <div className="flex justify-end gap-2 pt-1 border-t border-[#30363d]">
            <button
              onClick={() => setShowCheckoutWarning(false)}
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={confirmCheckoutWithChanges}
              className="px-2.5 py-1 rounded text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-medium shadow cursor-pointer"
            >
              Cambiar de todas formas
            </button>
          </div>
        </div>
      ) : showDeleteConfirm ? (
        /* Subdialog 2: Delete Branch Confirmation */
        <div className="p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>{state.isRemote ? "Eliminar Rama en GitHub" : "Eliminar Rama Local"}</span>
          </div>
          <p className="text-[11px] text-[#c9d1d9] leading-relaxed">
            {state.isRemote ? (
              <>
                ¿Confirmas que deseas eliminar permanentemente la rama remota{" "}
                <span className="text-rose-300 font-mono font-medium">{state.branchName}</span> del
                servidor de GitHub?
              </>
            ) : (
              <>
                ¿Confirmas que deseas eliminar la rama local{" "}
                <span className="text-white font-mono font-medium">{state.branchName}</span>?
              </>
            )}
          </p>
          <div className="flex justify-end gap-2 pt-1 border-t border-[#30363d]">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-2.5 py-1 rounded text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-medium shadow cursor-pointer"
            >
              Eliminar {state.isRemote ? "de GitHub" : ""}
            </button>
          </div>
        </div>
      ) : showRenamePrompt ? (
        /* Subdialog 3: Rename Branch Prompt */
        <form onSubmit={submitRename} className="p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
            <Edit2 className="w-4 h-4 shrink-0" />
            <span>Renombrar Rama</span>
          </div>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-2 pt-1 border-t border-[#30363d]">
            <button
              type="button"
              onClick={() => setShowRenamePrompt(false)}
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!renameValue.trim() || renameValue.trim() === cleanBranchName}
              className="px-2.5 py-1 rounded text-[11px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium shadow cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      ) : (
        /* Standard Context Menu Options matching user's screenshots */
        <>
          {/* Header Info */}
          <div className="px-3 py-2 bg-[#0d1117]/80 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              {state.isRemote ? (
                <Cloud className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className="font-mono font-bold text-white text-[11px] truncate">
                {state.branchName}
              </span>
            </div>
            {state.isHead ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded uppercase">
                HEAD
              </span>
            ) : state.isRemote ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded uppercase">
                Remoto
              </span>
            ) : null}
          </div>

          {/* Section 1: Checkout & Branch Sync */}
          <div className="py-1">
            <button
              onClick={handleCheckoutClick}
              disabled={state.isHead}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                Checkout {state.isRemote ? `origin/${cleanBranchName}` : state.branchName}
              </span>
            </button>

            {/* Fast-forward Pull (Local branch) */}
            {!state.isRemote && onPull && (
              <button
                onClick={() => {
                  onPull(state.branchName);
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Pull (Fast-forward desde origin)</span>
              </button>
            )}

            {/* Push to remote (Local branch) */}
            {!state.isRemote && onPush && (
              <button
                onClick={() => {
                  onPush(state.branchName);
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Push a origin</span>
              </button>
            )}
          </div>

          {/* Section 2: Create branch or tag here */}
          <div className="py-1">
            {onCreateBranchHere && (
              <button
                onClick={() => {
                  onCreateBranchHere(state.commitOid || "HEAD", state.branchName);
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Crear nueva rama desde aquí...</span>
              </button>
            )}

            {onCreateTagHere && (
              <button
                onClick={() => {
                  onCreateTagHere(state.commitOid || "HEAD");
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Crear etiqueta (Tag) en este commit...</span>
              </button>
            )}
          </div>

          {/* Section 3: Merge & Rebase */}
          <div className="py-1">
            <button
              onClick={() => {
                onMerge(state.branchName);
                onClose();
              }}
              disabled={state.isHead}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Merge en rama actual ({currentBranch || "HEAD"})</span>
            </button>

            {!state.isRemote && (
              <button
                onClick={() => {
                  onRebase(state.branchName);
                  onClose();
                }}
                disabled={state.isHead}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Rebase sobre rama actual ({currentBranch || "HEAD"})</span>
              </button>
            )}
          </div>

          {/* Section 4: GitHub Integration (PR & Links) */}
          <div className="py-1">
            {onStartPullRequest && (
              <button
                onClick={() => {
                  onStartPullRequest(cleanBranchName);
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Crear Pull Request con IA...</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded uppercase ml-auto">
                  Nativo
                </span>
              </button>
            )}

            {githubUrls && (
              <button
                onClick={handleOpenPr}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Ver comparativa en GitHub Web</span>
                <ExternalLink className="w-3 h-3 text-[#8b949e] ml-auto" />
              </button>
            )}

            {!state.isRemote && (
              <button
                onClick={handleRenameClick}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>Renombrar rama...</span>
              </button>
            )}
          </div>

          {/* Section 5: Copy Actions */}
          <div className="py-1">
            <button
              onClick={() => handleCopy(state.branchName, "name")}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              {copiedType === "name" ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
              )}
              <span>{copiedType === "name" ? "¡Nombre copiado!" : "Copiar nombre de la rama"}</span>
            </button>

            {state.commitOid && (
              <button
                onClick={() => handleCopy(state.commitOid!, "sha")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                {copiedType === "sha" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                )}
                <span>
                  {copiedType === "sha"
                    ? "¡SHA copiado!"
                    : `Copiar commit SHA (${state.commitOid.slice(0, 7)})`}
                </span>
              </button>
            )}

            {githubUrls && (
              <button
                onClick={() => handleCopy(githubUrls.branchUrl, "link")}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                {copiedType === "link" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Link className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                )}
                <span>
                  {copiedType === "link" ? "¡Enlace copiado!" : "Copiar enlace de rama en GitHub"}
                </span>
              </button>
            )}
          </div>

          {/* Section 6: Delete Branch (Destructive) */}
          <div className="py-1">
            <button
              onClick={handleDeleteClick}
              disabled={state.isHead}
              className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {state.isRemote
                  ? `Eliminar origin/${cleanBranchName} de GitHub`
                  : `Eliminar rama ${state.branchName}`}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
