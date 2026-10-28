import React from "react";
import { GitMerge, ArrowRight, Cloud, GitBranch, RefreshCw, X, GitPullRequest } from "lucide-react";
import { Button } from "./Button";

interface BranchMergeModalProps {
  isOpen: boolean;
  sourceBranch: string;
  targetBranch: string;
  isRemote: boolean;
  onClose: () => void;
  onMerge: (source: string) => void;
  onRebase: (source: string) => void;
  onPull?: (source: string) => void;
}

export const BranchMergeModal: React.FC<BranchMergeModalProps> = ({
  isOpen,
  sourceBranch,
  targetBranch,
  isRemote,
  onClose,
  onMerge,
  onRebase,
  onPull,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <GitMerge className="w-4 h-4 text-purple-400" />
            <span>Mover Cambios entre Ramas (Drag & Drop)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Visual Branch Transfer */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-center gap-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] border border-purple-500/40 text-purple-300 font-mono text-xs font-medium">
              {isRemote ? (
                <Cloud className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <GitBranch className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              )}
              <span className="truncate max-w-[140px]">{sourceBranch}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f6feb]/20 border border-blue-500/50 text-white font-mono text-xs font-semibold">
              <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate max-w-[140px]">{targetBranch}</span>
            </div>
          </div>

          <p className="text-xs text-[#8b949e] text-center">
            Selecciona la operación que deseas aplicar sobre la rama de destino:
          </p>

          {/* Action Options */}
          <div className="flex flex-col gap-2">
            {isRemote && onPull && (
              <button
                onClick={() => {
                  onPull(sourceBranch);
                  onClose();
                }}
                className="flex items-start gap-3 p-3 rounded-lg border border-[#30363d] hover:border-emerald-500 bg-[#21262d]/50 hover:bg-[#21262d] transition-all text-left group"
              >
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-105 transition-transform">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white text-xs group-hover:text-emerald-300 transition-colors">
                    Pull (Fast-forward) en {targetBranch}
                  </span>
                  <span className="text-[11px] text-[#8b949e] leading-snug mt-0.5">
                    Descarga e incorpora los commits del servidor remoto directamente en tu rama local activa.
                  </span>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                onMerge(sourceBranch);
                onClose();
              }}
              className="flex items-start gap-3 p-3 rounded-lg border border-[#30363d] hover:border-blue-500 bg-[#21262d]/50 hover:bg-[#21262d] transition-all text-left group"
            >
              <div className="p-2 rounded bg-blue-950/40 border border-blue-500/30 text-blue-400 mt-0.5 shrink-0 group-hover:scale-105 transition-transform">
                <GitMerge className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white text-xs group-hover:text-blue-300 transition-colors">
                  Merge {sourceBranch} en {targetBranch}
                </span>
                <span className="text-[11px] text-[#8b949e] leading-snug mt-0.5">
                  Combina los historiales creando un commit de fusión. Si existen conflictos, se abrirá el resolvedor 3-way merge.
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                onRebase(sourceBranch);
                onClose();
              }}
              className="flex items-start gap-3 p-3 rounded-lg border border-[#30363d] hover:border-amber-500 bg-[#21262d]/50 hover:bg-[#21262d] transition-all text-left group"
            >
              <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 mt-0.5 shrink-0 group-hover:scale-105 transition-transform">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white text-xs group-hover:text-amber-300 transition-colors">
                  Rebase {targetBranch} sobre {sourceBranch}
                </span>
                <span className="text-[11px] text-[#8b949e] leading-snug mt-0.5">
                  Vuelve a aplicar los commits de {targetBranch} uno por uno sobre la punta de {sourceBranch} manteniendo un historial lineal.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0d1117] border-t border-[#30363d] flex justify-end">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
