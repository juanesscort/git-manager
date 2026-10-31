import React, { useState } from "react";
import { AlertTriangle, X, Loader2, Undo2, FileText, Files } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export interface DiscardChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  target: {
    type: "single" | "all";
    filePath?: string;
    totalCount?: number;
  } | null;
}

export const DiscardChangesModal: React.FC<DiscardChangesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  target,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !target) return null;

  const isSingle = target.type === "single";

  const handleDiscard = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                {isSingle ? "Descartar Cambios del Archivo" : "Descartar Todos los Cambios"}
              </h3>
              <p className="text-[11px] text-[#8b949e]">
                Acción irreversible en archivos no preparados
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
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Details */}
          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center gap-3">
            {isSingle ? (
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <Files className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div className="overflow-hidden flex-1">
              <div className="text-[11px] text-[#8b949e] uppercase font-semibold tracking-wider">
                {isSingle ? "Archivo afectado" : "Archivos afectados"}
              </div>
              <div className="text-xs font-mono text-white truncate font-medium mt-0.5">
                {isSingle ? target.filePath : `${target.totalCount || 0} archivos en "Sin preparar"`}
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-xl text-xs text-rose-200/90 leading-relaxed">
            <p>
              ¿Estás seguro de que deseas revertir estos cambios? Se restaurará el contenido al último
              commit y los archivos sin seguimiento se eliminarán del disco.
            </p>
            <p className="text-[11px] text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
              <span>⚠️</span> Esta operación no se puede deshacer.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 border-t border-[#30363d] bg-[#0d1117]/50 flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <button
            onClick={handleDiscard}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-950/50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Descartando...
              </>
            ) : (
              <>
                <Undo2 className="w-3.5 h-3.5" />
                {isSingle ? "Descartar Cambios" : "Descartar Todo"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
