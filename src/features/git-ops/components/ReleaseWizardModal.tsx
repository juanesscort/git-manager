import React, { useState, useEffect } from "react";
import {
  Rocket,
  X,
  AlertTriangle,
  GitBranch,
  UploadCloud,
  Loader2,
  GitPullRequest,
  RotateCw,
  Tag,
  FileText,
  Info,
  Lock,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../../../components/ui/Button";

interface ReleaseWizardModalProps {
  isOpen: boolean;
  repoPath: string | null;
  currentBranch?: string | null;
  openPrCount?: number;
  activeRunsCount?: number;
  hasUncommittedChanges?: boolean;
  uncommittedChangesCount?: number;
  onClose: () => void;
  onReleaseStart?: () => void;
  onReleaseError?: () => void;
  onReleaseSuccess: (version: string) => void;
}

export const ReleaseWizardModal: React.FC<ReleaseWizardModalProps> = ({
  isOpen,
  repoPath,
  currentBranch,
  openPrCount = 0,
  activeRunsCount = 0,
  hasUncommittedChanges = false,
  uncommittedChangesCount = 0,
  onClose,
  onReleaseStart,
  onReleaseError,
  onReleaseSuccess,
}) => {
  const [projectVersion, setProjectVersion] = useState<string>(
    __APP_VERSION__ || "0.4.0"
  );
  const [tagName, setTagName] = useState<string>(`v${__APP_VERSION__ || "0.4.0"}`);
  const [releaseNotes, setReleaseNotes] = useState<string>("");

  const isMain = currentBranch === "main";
  const isDev = currentBranch === "dev";

  const [mergeFromDev, setMergeFromDev] = useState(isDev);
  const [pushToOrigin, setPushToOrigin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAiReleaseNotes = async () => {
    if (!repoPath || !tagName) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const generated = await invoke<string>("generate_ai_release_notes", {
        repoPath,
        tagName,
      });
      if (generated) {
        setReleaseNotes(generated);
      }
    } catch (err: unknown) {
      console.error("Error generando notas de release con IA:", err);
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : JSON.stringify(err);
      setAiError(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const [copiedBump, setCopiedBump] = useState(false);

  const handleCopyBumpCommand = () => {
    const cmd = `npm run bump ${projectVersion}`;
    navigator.clipboard.writeText(cmd);
    setCopiedBump(true);
    setTimeout(() => setCopiedBump(false), 2000);
  };

  useEffect(() => {
    if (isOpen && repoPath) {
      invoke<string | null>("get_project_version_cmd", { path: repoPath })
        .then((ver) => {
          if (ver) {
            setProjectVersion(ver);
            setTagName(`v${ver}`);
          }
        })
        .catch((err) => {
          console.error("Error al obtener la versión del proyecto:", err);
        });
    }
  }, [isOpen, repoPath]);

  if (!isOpen) return null;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    const cleanTag = tagName.trim();
    if (!cleanTag) {
      setError("Por favor ingresa un nombre para la etiqueta (ej. v0.4.0)");
      return;
    }

    setSubmitting(true);
    setError(null);
    onReleaseStart?.();

    try {
      await invoke<string>("execute_git_manager_release_cmd", {
        path: repoPath,
        tagName: cleanTag,
        releaseNotes: releaseNotes.trim() ? releaseNotes.trim() : null,
        mergeFromDev: isDev ? mergeFromDev : false,
        pushToOrigin,
      });

      onClose();
      onReleaseSuccess(cleanTag);
    } catch (err: unknown) {
      console.error("Error al lanzar la release:", err);
      setError(typeof err === "string" ? err : JSON.stringify(err));
      setSubmitting(false);
      onReleaseError?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Lanzar Release Oficial
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-500/30">
                  Git-Manager Oficial
                </span>
              </div>
              <p className="text-[11px] text-[#8b949e]">
                Etiqueta el commit actual de main, lo publica en GitHub y dispara la compilación en GitHub Actions.
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

        <form onSubmit={handleLaunch} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Flecha 2: Dirty Workspace Warning & Lock */}
          {hasUncommittedChanges && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/50 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 shadow-inner">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-rose-300">
                  Espacio de trabajo sucio ({uncommittedChangesCount || "con"} cambio(s) pendiente(s))
                </span>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  No es posible publicar una versión mientras existan archivos modificados sin confirmar o preparar. El formulario se ha bloqueado en modo de <strong>solo lectura</strong> para evitar inconsistencias. Haz commit o stash para reactivarlo.
                </p>
              </div>
            </div>
          )}

          {/* In-Progress Actions or Pending PRs warning */}
          {(activeRunsCount > 0 || openPrCount > 0) && (
            <div className="space-y-1.5 text-xs">
              {activeRunsCount > 0 && (
                <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 text-amber-200 rounded-xl flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <span>
                    Hay <strong>{activeRunsCount} pipeline(s) de Actions en ejecución</strong> en este momento.
                  </span>
                </div>
              )}
              {openPrCount > 0 && (
                <div className="p-2.5 bg-purple-950/30 border border-purple-500/40 text-purple-200 rounded-xl flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Hay <strong>{openPrCount} Pull Request(s) pendiente(s) de revisión</strong> en GitHub.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Current Branch Validation */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8b949e] flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                Rama activa actual:
              </span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${
                  isMain
                    ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-950/50 text-amber-300 border border-amber-500/40"
                }`}
              >
                {currentBranch || "Desconocida"}
              </span>
            </div>

            {isDev && (
              <div className="pt-2 border-t border-[#30363d]/60 text-xs">
                <label className={`flex items-start gap-2 ${hasUncommittedChanges ? "opacity-60 cursor-not-allowed" : "text-white cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={mergeFromDev}
                    disabled={submitting || hasUncommittedChanges}
                    onChange={(e) => setMergeFromDev(e.target.checked)}
                    className="mt-0.5 rounded border-[#30363d] text-emerald-500 focus:ring-0 disabled:opacity-50"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-emerald-300">
                      Fusionar automáticamente 'dev' en 'main' antes de publicar
                    </span>
                    <span className="text-[10px] text-[#8b949e]">
                      Recomendado. Ejecuta checkout a 'main' y fusiona tus cambios de 'dev' para que la release resida en producción oficial.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {!isMain && !isDev && (
              <p className="text-[11px] text-amber-400 pt-1">
                ⚠️ Estás en una rama no estándar. Se recomienda cambiar a 'main' antes de lanzar una versión oficial.
              </p>
            )}
          </div>

          {/* Current Detected Version Info con Comando de Copia Rápida */}
          <div className="p-3 bg-purple-950/15 border border-purple-500/20 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="text-white">
                Versión configurada en archivos del proyecto:{" "}
                <span className="font-mono font-bold text-purple-300">
                  v{projectVersion}
                </span>
              </div>
              <div className="text-[10px] text-[#8b949e] flex flex-wrap items-center gap-1.5 leading-relaxed">
                <span>Para cambiar la versión del código ejecuta previamente en consola:</span>
                <span className="inline-flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded font-mono text-purple-300">
                  <code>npm run bump {projectVersion}</code>
                  <button
                    type="button"
                    onClick={handleCopyBumpCommand}
                    className="p-0.5 hover:text-white transition-colors cursor-pointer text-[#8b949e]"
                    title={copiedBump ? "¡Comando copiado!" : "Copiar comando a portapapeles"}
                  >
                    {copiedBump ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-purple-400 hover:text-purple-300" />
                    )}
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* Tag Name Input (Protegido contra edición accidental) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#8b949e] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                Nombre de la Etiqueta Git (Tag):
              </label>
              <span className="text-[10px] text-purple-300/80 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3 text-purple-400" />
                Vinculada a package.json
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={tagName}
                readOnly
                disabled={submitting || hasUncommittedChanges}
                placeholder="ej. v0.4.0"
                className="w-full px-3 py-2 text-xs bg-[#0d1117]/80 border border-[#30363d] rounded-xl text-purple-300 font-mono font-medium focus:outline-hidden cursor-default select-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Release Notes Textarea con Generador IA Estandarizado */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[#8b949e] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Mensaje o Notas de la Release (Opcional):
              </label>
              <button
                type="button"
                onClick={handleGenerateAiReleaseNotes}
                disabled={aiGenerating || submitting || hasUncommittedChanges}
                className={`p-1.5 rounded transition-colors cursor-pointer border ${
                  aiGenerating
                    ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 border-amber-500/20 bg-amber-950/10"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={
                  aiGenerating
                    ? "Generando notas de versión con IA..."
                    : "Generar resumen de cambios y notas de versión con IA a partir de commits recientes"
                }
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${aiGenerating ? "animate-pulse text-amber-300" : "text-amber-400"}`}
                />
              </button>
            </div>

            {aiError && (
              <div className="p-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <textarea
              value={releaseNotes}
              disabled={submitting || hasUncommittedChanges || aiGenerating}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Escribe o genera un resumen de novedades o cambios importantes..."
              rows={4}
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] rounded-xl text-white placeholder-[#484f58] focus:outline-hidden focus:border-purple-500 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            />
          </div>

          {/* GitHub Push Option */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs">
            <label className={`flex items-center gap-2 select-none ${hasUncommittedChanges ? "opacity-60 cursor-not-allowed" : "text-white cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={pushToOrigin}
                disabled={submitting || hasUncommittedChanges}
                onChange={(e) => setPushToOrigin(e.target.checked)}
                className="rounded border-[#30363d] text-purple-500 focus:ring-0 disabled:opacity-50"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                  Subir inmediatamente a GitHub (git push origin main y tag)
                </span>
                <span className="text-[10px] text-[#8b949e]">
                  Dispara el flujo de GitHub Actions para compilar los paquetes .deb, .rpm y .AppImage automáticamente.
                </span>
              </div>
            </label>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              type="button"
            >
              Cancelar
            </Button>

            <Button
              size="sm"
              variant="primary"
              type="submit"
              disabled={submitting || !tagName.trim() || activeRunsCount > 0 || hasUncommittedChanges}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer shadow-lg shadow-purple-900/30 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando {tagName}...</span>
                </>
              ) : hasUncommittedChanges ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-300" />
                  <span>Espacio bloqueado (cambios pendientes)</span>
                </>
              ) : activeRunsCount > 0 ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Pipeline en ejecución...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Publicar Release {tagName}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
