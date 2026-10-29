import React, { useState } from "react";
import { Tag, X, GitCommit, UploadCloud } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface CreateTagModalProps {
  isOpen: boolean;
  targetCommitOid?: string;
  targetCommitSummary?: string;
  onClose: () => void;
  onCreateTag: (
    name: string,
    targetCommit: string,
    message?: string,
    pushToRemote?: boolean
  ) => Promise<boolean>;
}

export const CreateTagModal: React.FC<CreateTagModalProps> = ({
  isOpen,
  targetCommitOid = "HEAD",
  targetCommitSummary,
  onClose,
  onCreateTag,
}) => {
  const [tagName, setTagName] = useState("");
  const [tagMessage, setTagMessage] = useState("");
  const [pushToRemote, setPushToRemote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await onCreateTag(
        tagName.trim(),
        targetCommitOid,
        tagMessage.trim() ? tagMessage.trim() : undefined,
        pushToRemote
      );
      setTagName("");
      setTagMessage("");
      setPushToRemote(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Crear Nueva Etiqueta (Tag)</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded text-rose-300 font-mono text-[11px]">
              {error}
            </div>
          )}

          {/* Target Commit Alert & Destination Indicator */}
          <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/40 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Destino de la Etiqueta
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-500/50 text-blue-200">
                {targetCommitOid === "HEAD" ? "HEAD (Punta activa)" : "Commit Seleccionado"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono bg-[#0d1117] px-2.5 py-1.5 rounded border border-[#30363d] text-[#c9d1d9]">
              <span className="px-1.5 py-0.2 rounded bg-[#21262d] text-cyan-300 font-bold text-[11px] border border-cyan-500/30 shrink-0">
                {targetCommitOid.slice(0, 7)}
              </span>
              <span className="truncate text-[11px] text-[#8b949e]">
                {targetCommitSummary || "Último commit de la rama actual"}
              </span>
            </div>

            <p className="text-[10px] text-blue-300/80 leading-relaxed">
              📍 Esta etiqueta quedará fijada permanentemente a este commit. No se moverá aunque agregues nuevos commits después.
            </p>
          </div>

          {/* Tag Name Input */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1">
              Nombre de la Etiqueta *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="ej. v1.0.0, release-2026, beta-1"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          {/* Tag Message (Optional, for annotated tags) */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1">
              Mensaje de la Etiqueta (Opcional)
            </label>
            <textarea
              placeholder="Descripción del release o notas de versión (crea un tag anotado)..."
              value={tagMessage}
              onChange={(e) => setTagMessage(e.target.value)}
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-mono resize-none"
            />
            <p className="text-[10px] text-[#8b949e] mt-1">
              Si dejas el mensaje vacío, se creará un <em>tag ligero (lightweight)</em>.
            </p>
          </div>

          {/* Checkbox: Push tag to remote (GitHub) immediately */}
          <div className="flex items-center gap-2 p-2 rounded bg-[#0d1117] border border-[#30363d]/70">
            <input
              type="checkbox"
              id="push-tag-remote"
              checked={pushToRemote}
              onChange={(e) => setPushToRemote(e.target.checked)}
              className="w-4 h-4 rounded border-[#30363d] bg-[#161b22] text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="push-tag-remote"
              className="text-xs text-[#c9d1d9] cursor-pointer select-none flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Subir etiqueta al remoto (GitHub) inmediatamente</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d] mt-1">
            <Button size="sm" variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="primary"
              type="submit"
              disabled={submitting || !tagName.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {submitting
                ? "Creando..."
                : `Crear Etiqueta en ${targetCommitOid === "HEAD" ? "HEAD" : targetCommitOid.slice(0, 7)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
