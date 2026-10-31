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
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../../../components/ui/Button";

interface ReleaseWizardModalProps {
  isOpen: boolean;
  repoPath: string | null;
  currentBranch?: string | null;
  openPrCount?: number;
  activeRunsCount?: number;
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
                <label className="flex items-start gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeFromDev}
                    onChange={(e) => setMergeFromDev(e.target.checked)}
                    className="mt-0.5 rounded border-[#30363d] text-emerald-500 focus:ring-0"
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

          {/* Current Detected Version Info */}
          <div className="p-3 bg-purple-950/15 border border-purple-500/20 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-white">
                Versión configurada en archivos del proyecto:{" "}
                <span className="font-mono font-bold text-purple-300">
                  v{projectVersion}
                </span>
              </div>
              <p className="text-[10px] text-[#8b949e]">
                El motor etiquetará el estado actual sin alterar archivos en disco. Para cambiar la versión del código ejecuta previamente en consola:{" "}
                <code className="text-purple-300 bg-purple-950/40 px-1 py-0.5 rounded">
                  npm run bump &lt;versión&gt;
                </code>
              </p>
            </div>
          </div>

          {/* Tag Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8b949e] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Nombre de la Etiqueta Git (Tag):
            </label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="ej. v0.4.0"
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] rounded-xl text-white font-mono focus:outline-hidden focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Release Notes Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8b949e] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              Mensaje o Notas de la Release (Opcional):
            </label>
            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Escribe un resumen de novedades o cambios importantes..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] rounded-xl text-white placeholder-[#484f58] focus:outline-hidden focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* GitHub Push Option */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs">
            <label className="flex items-center gap-2 text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pushToOrigin}
                onChange={(e) => setPushToOrigin(e.target.checked)}
                className="rounded border-[#30363d] text-purple-500 focus:ring-0"
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
              disabled={submitting || !tagName.trim() || activeRunsCount > 0}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer shadow-lg shadow-purple-900/30 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando {tagName}...</span>
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
