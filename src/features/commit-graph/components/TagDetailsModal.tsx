import React, { useState, useEffect } from "react";
import {
  Tag,
  X,
  Copy,
  Check,
  UploadCloud,
  Download,
  Trash2,
  GitCommit,
  Calendar,
  User,
  CheckCircle2,
  HardDrive,
  Cloud,
  AlertTriangle,
} from "lucide-react";
import { UnifiedGitTag } from "../../../types/git";
import { Button } from "../../../components/ui/Button";

interface TagDetailsModalProps {
  isOpen: boolean;
  tag: UnifiedGitTag | null;
  initialShowDeleteConfirm?: boolean;
  onClose: () => void;
  onUpdateTag?: (
    oldName: string,
    newName: string,
    targetCommit: string,
    message?: string
  ) => Promise<boolean>;
  onPushTag?: (name: string) => void;
  onFetchTag?: (name: string) => void;
  onDeleteTag?: (
    name: string,
    deleteLocal: boolean,
    deleteRemote: boolean
  ) => Promise<string | void>;
}

export const TagDetailsModal: React.FC<TagDetailsModalProps> = ({
  isOpen,
  tag,
  initialShowDeleteConfirm = false,
  onClose,
  onUpdateTag,
  onPushTag,
  onFetchTag,
  onDeleteTag,
}) => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [copiedField, setCopiedField] = useState<
    "name" | "message" | "commit" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Granular Delete Dialog State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLocalOption, setDeleteLocalOption] = useState(true);
  const [deleteRemoteOption, setDeleteRemoteOption] = useState(true);

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setMessage(tag.message || "");
      setError(null);
      setShowDeleteConfirm(Boolean(initialShowDeleteConfirm));
      setDeleteLocalOption(tag.is_local);
      setDeleteRemoteOption(tag.is_remote);
    }
  }, [tag, initialShowDeleteConfirm]);

  if (!isOpen || !tag) return null;

  const isSynced = tag.is_local && tag.is_remote;
  const isLocalOnly = tag.is_local && !tag.is_remote;
  const isRemoteOnly = !tag.is_local && tag.is_remote;

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
    if (!tag.is_local) {
      setError(
        "Esta etiqueta solo existe en GitHub. Primero debes traerla a local para poder modificarla."
      );
      return;
    }
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
      if (onUpdateTag && tag.target_commit_id) {
        await onUpdateTag(
          tag.name,
          cleanName,
          tag.target_commit_id,
          message.trim() ? message.trim() : undefined
        );
      }
      onClose();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw);
    } finally {
      setSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!onDeleteTag) return;
    setSubmitting(true);
    setError(null);
    try {
      await onDeleteTag(tag.name, deleteLocalOption, deleteRemoteOption);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
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
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                showDeleteConfirm
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {showDeleteConfirm ? <Trash2 className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  {showDeleteConfirm ? "Eliminar Etiqueta" : "Detalles de la Etiqueta"}
                </h3>
                {isSynced && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Sincronizada
                  </span>
                )}
                {isLocalOnly && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/50 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <HardDrive className="w-2.5 h-2.5" /> Solo Local
                  </span>
                )}
                {isRemoteOnly && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-950/50 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                    <Cloud className="w-2.5 h-2.5" /> Solo en GitHub
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8b949e]">
                {showDeleteConfirm
                  ? `Configura la eliminación de '${tag.name}' en local y/o en GitHub.`
                  : "Inspecciona metadatos, sincroniza con GitHub o edita los detalles."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm ? (
          <div className="p-5 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start gap-3 p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-rose-300">
                  ¿Cómo deseas eliminar la etiqueta '{tag.name}'?
                </p>
                <p className="text-[#8b949e] text-[11px] mt-1">
                  Selecciona exactamente los destinos donde se eliminará. Puedes conservar una copia local o en GitHub según tu conveniencia.
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d] text-xs">
              {tag.is_local && (
                <label className="flex items-center gap-2 text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deleteLocalOption}
                    onChange={(e) => setDeleteLocalOption(e.target.checked)}
                    className="rounded border-[#30363d] text-rose-500 focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">Eliminar de mi máquina local</span>
                    <span className="text-[10px] text-[#8b949e]">
                      Borra la referencia git local del repositorio.
                    </span>
                  </div>
                </label>
              )}

              {tag.is_remote && (
                <label className="flex items-center gap-2 text-white cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={deleteRemoteOption}
                    onChange={(e) => setDeleteRemoteOption(e.target.checked)}
                    className="rounded border-[#30363d] text-rose-500 focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">Eliminar del repositorio remoto en GitHub</span>
                    <span className="text-[10px] text-[#8b949e]">
                      Ejecutará 'git push origin --delete {tag.name}'.
                    </span>
                  </div>
                </label>
              )}
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (initialShowDeleteConfirm) {
                    onClose();
                  } else {
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={submitting}
              >
                {initialShowDeleteConfirm ? "Cancelar" : "Volver"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={executeDelete}
                disabled={submitting || (!deleteLocalOption && !deleteRemoteOption)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                {submitting ? "Eliminando..." : "Confirmar Eliminación"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 flex flex-col space-y-4 overflow-y-auto">
            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-lg">
                {error}
              </div>
            )}

            {/* Remote Only notice */}
            {isRemoteOnly && (
              <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-sky-200">
                  <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Esta etiqueta existe en GitHub pero no está en tu máquina local.</span>
                </div>
                {onFetchTag && (
                  <button
                    type="button"
                    onClick={() => {
                      onFetchTag(tag.name);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition-colors shrink-0 ml-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Traer a Local</span>
                  </button>
                )}
              </div>
            )}

            {/* Tag Name Input with Copy Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#8b949e]">
                  Nombre de la Etiqueta:
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(name, "name")}
                  className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                  title="Copiar nombre"
                >
                  {copiedField === "name" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isRemoteOnly}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* Commit Target info */}
            {tag.target_commit_id && (
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8b949e] flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5 text-cyan-400" /> Commit Objetivo:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(tag.target_commit_id!, "commit")}
                    className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-white font-mono"
                    title="Copiar Hash completo"
                  >
                    {copiedField === "commit" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span className="text-cyan-400 font-bold">{tag.short_target_id}</span>
                  </button>
                </div>

                {tag.tagger_name && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8b949e] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" /> Creado por:
                    </span>
                    <span className="text-[#c9d1d9]">{tag.tagger_name}</span>
                  </div>
                )}

                {formattedDate && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8b949e] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" /> Fecha:
                    </span>
                    <span className="text-[#c9d1d9]">{formattedDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Description / Annotation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#8b949e]">
                  Descripción / Mensaje de la Etiqueta:
                </label>
                {message && (
                  <button
                    type="button"
                    onClick={() => handleCopy(message, "message")}
                    className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                    title="Copiar descripción"
                  >
                    {copiedField === "message" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isRemoteOnly}
                rows={3}
                placeholder="Añade un mensaje o notas de versión para esta etiqueta..."
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-sans text-white focus:outline-hidden focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#30363d] mt-2">
              <div className="flex items-center gap-2">
                {/* Delete button triggering granular confirm */}
                {onDeleteTag && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
                    title="Opciones de eliminación (local o GitHub)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar...</span>
                  </button>
                )}

                {/* Push to GitHub button if local only */}
                {isLocalOnly && onPushTag && (
                  <button
                    type="button"
                    onClick={() => {
                      onPushTag(tag.name);
                      onClose();
                    }}
                    className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
                    title="Publicar etiqueta en GitHub"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Subir a GitHub</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={onClose} type="button">
                  Cerrar
                </Button>
                {tag.is_local && (
                  <Button
                    size="sm"
                    variant="primary"
                    type="submit"
                    disabled={submitting || !hasChanges}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-lg shadow-emerald-900/30"
                  >
                    {submitting ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
