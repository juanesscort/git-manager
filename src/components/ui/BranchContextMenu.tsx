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
  Check,
} from "lucide-react";

export interface BranchContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  branchName: string;
  isHead: boolean;
  isRemote: boolean;
}

interface BranchContextMenuProps {
  state: BranchContextMenuState;
  currentBranch?: string | null;
  hasUncommittedChanges: boolean;
  onClose: () => void;
  onCheckout: (branchName: string) => void;
  onMerge: (branchName: string) => void;
  onRebase: (branchName: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (branchName: string) => void;
}

export const BranchContextMenu: React.FC<BranchContextMenuProps> = ({
  state,
  currentBranch,
  hasUncommittedChanges,
  onClose,
  onCheckout,
  onMerge,
  onRebase,
  onRename,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Close when clicking outside
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
    setRenameValue(state.branchName);
    setShowRenamePrompt(true);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue.trim() !== state.branchName) {
      onRename(state.branchName, renameValue.trim());
    }
    onClose();
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(state.branchName);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 800);
  };

  // Adjust menu coordinates to stay inside viewport
  const menuWidth = 260;
  const menuHeight = 320;
  const adjustedX = Math.min(state.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(state.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-1 text-xs select-none animate-in fade-in duration-100 divide-y divide-[#30363d]/60 font-sans"
    >
      {/* Subdialog 1: Checkout Warning with uncommitted changes */}
      {showCheckoutWarning ? (
        <div className="p-3 flex flex-col gap-2.5">
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
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
            >
              Cancelar
            </button>
            <button
              onClick={confirmCheckoutWithChanges}
              className="px-2.5 py-1 rounded text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-medium shadow"
            >
              Cambiar de todas formas
            </button>
          </div>
        </div>
      ) : showDeleteConfirm ? (
        /* Subdialog 2: Delete Branch Confirmation */
        <div className="p-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Eliminar Rama Local</span>
          </div>
          <p className="text-[11px] text-[#c9d1d9] leading-relaxed">
            ¿Confirmas que deseas eliminar la rama{" "}
            <span className="text-white font-mono font-medium">{state.branchName}</span>?
          </p>
          <div className="flex justify-end gap-2 pt-1 border-t border-[#30363d]">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-2.5 py-1 rounded text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-medium shadow"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : showRenamePrompt ? (
        /* Subdialog 3: Rename Branch Prompt */
        <form onSubmit={submitRename} className="p-3 flex flex-col gap-2.5">
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
              className="px-2 py-1 rounded text-[11px] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!renameValue.trim() || renameValue.trim() === state.branchName}
              className="px-2.5 py-1 rounded text-[11px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium shadow"
            >
              Guardar
            </button>
          </div>
        </form>
      ) : (
        /* Standard Context Menu Options matching user's screenshot */
        <>
          {/* Section 1: Checkout, Merge, Rebase */}
          <div className="py-1">
            <button
              onClick={handleCheckoutClick}
              disabled={state.isHead}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Checkout branch {state.isHead ? "(Actual)" : ""}</span>
            </button>

            <button
              onClick={() => {
                onMerge(state.branchName);
                onClose();
              }}
              disabled={state.isHead}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors"
            >
              <GitMerge className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Merge branch en {currentBranch || "HEAD"}</span>
            </button>

            <button
              onClick={() => {
                onRebase(state.branchName);
                onClose();
              }}
              disabled={state.isHead}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Rebase branch sobre {state.branchName}</span>
            </button>
          </div>

          {/* Section 2: Rename, Upstream */}
          <div className="py-1">
            {!state.isRemote && (
              <button
                onClick={handleRenameClick}
                className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Rename branch</span>
              </button>
            )}

            <button
              onClick={() => {
                navigator.clipboard.writeText(`git push -u origin ${state.branchName}`);
                onClose();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Change default upstream branch</span>
            </button>
          </div>

          {/* Section 3: Delete Branch */}
          {!state.isRemote && (
            <div className="py-1">
              <button
                onClick={handleDeleteClick}
                disabled={state.isHead}
                title={state.isHead ? "No puedes eliminar la rama activa HEAD" : ""}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-2.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Delete branch {state.isHead ? "(HEAD bloqueado)" : ""}</span>
              </button>
            </div>
          )}

          {/* Section 4: Copy Branch Name */}
          <div className="py-1">
            <button
              onClick={handleCopyName}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2.5 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
              )}
              <span>{copied ? "¡Nombre copiado!" : "Copy branch name"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
