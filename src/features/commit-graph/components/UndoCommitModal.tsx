import React, { useState } from "react";
import { Undo2, X, AlertCircle, CheckCircle2, GitCommit, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { CommitInfo } from "../../../types/git";

interface UndoCommitModalProps {
  isOpen: boolean;
  commit: CommitInfo | null;
  onClose: () => void;
  onConfirm: (keepStaged: boolean) => Promise<void>;
}

export const UndoCommitModal: React.FC<UndoCommitModalProps> = ({
  isOpen,
  commit,
  onClose,
  onConfirm,
}) => {
  const [keepStaged, setKeepStaged] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !commit) return null;

  const shortOid = commit.short_oid || commit.oid.slice(0, 7);
  const commitSummary = commit.summary || commit.message.split("\n")[0] || "";

  const handleUndo = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(keepStaged);
      onClose();
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Deshacer Último Commit
              </h3>
              <p className="text-[11px] text-[#8b949e]">
                Revierte la confirmación sin perder tus cambios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Commit Info */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8b949e] flex items-center gap-1.5 font-mono">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                {shortOid}
              </span>
              <span className="text-[11px] text-[#8b949e] truncate max-w-[150px]">
                {commit.author_name}
              </span>
            </div>
            <div className="text-xs font-medium text-white truncate pt-0.5">
              {commitSummary}
            </div>
          </div>

          {/* Explanation Alert */}
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Tus archivos y modificaciones están 100% seguros.</strong>
              <p className="text-[11px] text-[#8b949e] mt-0.5">
                Solo se retirará el registro del commit del historial. Ninguna línea de código será eliminada de tu disco.
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#8b949e]">
              Destino de los cambios deshechos:
            </label>
            <div className="space-y-2">
              <label
                onClick={() => setKeepStaged(true)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  keepStaged
                    ? "bg-amber-950/20 border-amber-500/60 text-white"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                }`}
              >
                <input
                  type="radio"
                  name="undo_mode"
                  checked={keepStaged}
                  onChange={() => setKeepStaged(true)}
                  className="mt-0.5 text-amber-500 focus:ring-0"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-white">
                    Mantener en Área de Preparación (Staged) — Recomendado
                  </span>
                  <span className="text-[11px] text-[#8b949e] mt-0.5">
                    Tus archivos quedarán listos para re-confirmar o editar el mensaje.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setKeepStaged(false)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  !keepStaged
                    ? "bg-amber-950/20 border-amber-500/60 text-white"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                }`}
              >
                <input
                  type="radio"
                  name="undo_mode"
                  checked={!keepStaged}
                  onChange={() => setKeepStaged(false)}
                  className="mt-0.5 text-amber-500 focus:ring-0"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-white">
                    Mover a No Preparados (Unstaged)
                  </span>
                  <span className="text-[11px] text-[#8b949e] mt-0.5">
                    Los archivos quedarán en tu disco como cambios de trabajo pendientes.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              type="button"
            >
              Cancelar
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handleUndo}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer shadow-lg shadow-amber-900/30 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deshaciendo commit...</span>
                </>
              ) : (
                <>
                  <Undo2 className="w-4 h-4" />
                  <span>Deshacer Commit</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
