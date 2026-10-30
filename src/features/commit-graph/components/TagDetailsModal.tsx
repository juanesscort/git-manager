import React, { useState, useEffect } from "react";
import { Tag, X, Copy, Check, UploadCloud, Trash2, GitCommit, Calendar, User } from "lucide-react";
import { GitTag } from "../../../types/git";
import { Button } from "../../../components/ui/Button";

interface TagDetailsModalProps {
  isOpen: boolean;
  tag: GitTag | null;
  onClose: () => void;
  onUpdateTag: (
    oldName: string,
    newName: string,
    targetCommit: string,
    message?: string
  ) => Promise<boolean>;
  onPushTag?: (name: string) => void;
  onDeleteTag?: (name: string) => void;
}

export const TagDetailsModal: React.FC<TagDetailsModalProps> = ({
  isOpen,
  tag,
  onClose,
  onUpdateTag,
  onPushTag,
  onDeleteTag,
}) => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [copiedField, setCopiedField] = useState<"name" | "message" | "commit" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setMessage(tag.message || "");
      setError(null);
    }
  }, [tag]);

  if (!isOpen || !tag) return null;

  const hasChanges =
    name.trim() !== tag.name || message.trim() !== (tag.message || "").trim();

  const handleCopy = (text: string, field: "name" | "message" | "commit") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("El nombre de la etiqueta no puede estar vacío.");
      return;
    }
    if (cleanName.includes(" ") || cleanName.includes("\t")) {
      setError("El nombre de la etiqueta no puede contener espacios en blanco.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onUpdateTag(
        tag.name,
        cleanName,
        tag.target_commit_id,
        message.trim() ? message.trim() : undefined
      );
      onClose();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = tag.timestamp
    ? new Date(tag.timestamp * 1000).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Detalles y Edición de Etiqueta (Tag)
              </h2>
              <p className="text-xs text-[#8b949e]">
                Inspecciona metadatos, copia información o edita la etiqueta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#30363d]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Tag Name Input + Copy Button */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                Nombre de la Etiqueta *
              </label>
              <button
                type="button"
                onClick={() => handleCopy(name, "name")}
                className="flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors cursor-pointer"
                title="Copiar nombre de la etiqueta"
              >
                {copiedField === "name" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">¡Nombre copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar nombre</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value.replace(/\s+/g, "-"));
                if (error) setError(null);
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              placeholder="ej. v1.0.0 o release-demo"
            />
          </div>

          {/* Commit Target info */}
          <div className="flex flex-col gap-1.5 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                <span>Commit Objetivo</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(tag.target_commit_id, "commit")}
                className="flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors cursor-pointer"
                title="Copiar hash completo del commit"
              >
                {copiedField === "commit" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">¡Hash copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar hash</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs text-white mt-0.5 truncate select-all">
              {tag.target_commit_id}
            </div>

            {/* Badges of tag type and remote status */}
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[#30363d]/60 text-[10px] font-mono">
              <span
                className={`px-2 py-0.5 rounded-full font-bold uppercase border ${
                  tag.is_annotated
                    ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                    : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                }`}
              >
                {tag.is_annotated ? "Etiqueta Anotada" : "Etiqueta Ligera"}
              </span>

              <span
                className={`px-2 py-0.5 rounded-full font-bold uppercase border ${
                  tag.is_remote
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {tag.is_remote ? "Sincronizada en GitHub" : "Solo en Local"}
              </span>

              {tag.tagger_name && (
                <div className="flex items-center gap-1 text-[#8b949e] ml-auto">
                  <User className="w-3 h-3 text-cyan-400" />
                  <span>{tag.tagger_name}</span>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-center gap-1 text-[#8b949e]">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tag Description / Message + Copy Button */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                Descripción / Mensaje Anotado
              </label>
              {message.trim() && (
                <button
                  type="button"
                  onClick={() => handleCopy(message, "message")}
                  className="flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors cursor-pointer"
                  title="Copiar descripción de la etiqueta"
                >
                  {copiedField === "message" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">¡Descripción copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar descripción</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Detalla las notas de versión, hitos o propósito de esta etiqueta..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-none font-sans leading-relaxed resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#30363d] mt-2">
            <div className="flex items-center gap-2">
              {/* Delete button */}
              {onDeleteTag && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Estás seguro de que deseas eliminar permanentemente la etiqueta '${tag.name}'?`
                      )
                    ) {
                      onDeleteTag(tag.name);
                      onClose();
                    }
                  }}
                  className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Eliminar esta etiqueta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              )}

              {/* Push to GitHub button if not remote */}
              {!tag.is_remote && onPushTag && (
                <button
                  type="button"
                  onClick={() => {
                    onPushTag(tag.name);
                    onClose();
                  }}
                  className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Publicar etiqueta en el repositorio remoto de GitHub"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Subir a GitHub</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="primary"
                type="submit"
                disabled={submitting || !hasChanges}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                {submitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
