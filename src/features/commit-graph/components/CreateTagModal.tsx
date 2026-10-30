import React, { useState } from "react";
import { Tag, X, UploadCloud } from "lucide-react";
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
  onClose,
  onCreateTag,
}) => {
  const [tagName, setTagName] = useState("");
  const [tagMessage, setTagMessage] = useState("");
  const [pushToRemote, setPushToRemote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTagNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically sanitize spaces to hyphens for seamless user experience
    const val = e.target.value.replace(/\s+/g, "-");
    setTagName(val);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tagName.trim();
    if (!clean) return;

    if (clean.includes(" ")) {
      setError("El nombre de la etiqueta no puede contener espacios en blanco. Usa guiones o puntos.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreateTag(
        clean,
        targetCommitOid,
        tagMessage.trim() ? tagMessage.trim() : undefined,
        pushToRemote
      );
      setTagName("");
      setTagMessage("");
      setPushToRemote(false);
      onClose();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes("InvalidSpec") || raw.includes("not valid") || raw.includes("espacios")) {
        setError(
          "Nombre de etiqueta inválido: no puede contener espacios en blanco ni caracteres especiales (~, ^, :, ?). Usa guiones o puntos como 'v1.0.0' o 'release-demo'."
        );
      } else {
        setError(raw);
      }
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
            <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded text-rose-300 font-sans text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Tag Name Input (Flecha 1) */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1">
              Nombre de la Etiqueta *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="ej. v1.0.0, release-demo (sin espacios)"
              value={tagName}
              onChange={handleTagNameChange}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-mono"
            />
            <p className="text-[10px] text-[#8b949e] mt-1">
              El nombre no debe contener espacios (los espacios se convierten automáticamente en guiones).
            </p>
          </div>

          {/* Tag Message (Optional, for annotated tags) */}
          <div>
            <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider block mb-1">
              Mensaje o Descripción de la Etiqueta (Opcional)
            </label>
            <textarea
              placeholder="Descripción del release o notas de versión (crea un tag anotado)..."
              value={tagMessage}
              onChange={(e) => setTagMessage(e.target.value)}
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-sans resize-none"
            />
            <p className="text-[10px] text-[#8b949e] mt-1">
              Si dejas el mensaje vacío, se creará un <em>tag ligero</em>. Si escribes una descripción, se mostrará en la lista de etiquetas.
            </p>
          </div>

          {/* Checkbox: Clean, modern look without heavy container (Flecha 3) */}
          <label className="flex items-center gap-2.5 cursor-pointer py-1 group select-none">
            <input
              type="checkbox"
              id="push-tag-remote"
              checked={pushToRemote}
              onChange={(e) => setPushToRemote(e.target.checked)}
              className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-emerald-500 focus:ring-0 cursor-pointer transition-colors"
            />
            <div className="flex items-center gap-1.5 text-xs text-[#c9d1d9] group-hover:text-white transition-colors">
              <UploadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Subir etiqueta al remoto (GitHub) inmediatamente</span>
            </div>
          </label>

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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {submitting ? "Creando..." : "Crear Etiqueta"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
