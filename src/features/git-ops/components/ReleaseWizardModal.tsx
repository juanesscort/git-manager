import React, { useState, useMemo } from "react";
import {
  Rocket,
  X,
  AlertTriangle,
  GitBranch,
  UploadCloud,
  Loader2,
  GitPullRequest,
  RotateCw,
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
  onReleaseSuccess: (version: string) => void;
}

export const ReleaseWizardModal: React.FC<ReleaseWizardModalProps> = ({
  isOpen,
  repoPath,
  currentBranch,
  openPrCount = 0,
  activeRunsCount = 0,
  onClose,
  onReleaseSuccess,
}) => {
  const currentVersion = __APP_VERSION__ || "0.4.0";

  // Calculate semantic version suggestions
  const semverSuggestions = useMemo(() => {
    const parts = currentVersion.split(".").map((n) => parseInt(n, 10) || 0);
    const major = parts[0] || 0;
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    return {
      patch: `${major}.${minor}.${patch + 1}`,
      minor: `${major}.${minor + 1}.0`,
      major: `${major + 1}.0.0`,
    };
  }, [currentVersion]);

  const [selectedVersion, setSelectedVersion] = useState<string>(
    semverSuggestions.patch
  );
  const [customVersion, setCustomVersion] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  const isMain = currentBranch === "main";
  const isDev = currentBranch === "dev";

  const [mergeFromDev, setMergeFromDev] = useState(isDev);
  const [pushToOrigin, setPushToOrigin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const finalVersion = isCustom ? customVersion.trim() : selectedVersion;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath) return;

    const cleanVer = finalVersion.replace(/^v/, "").trim();
    if (!cleanVer || cleanVer.split(".").length < 3) {
      setError("Por favor ingresa una versión semántica válida (ej. 0.4.1)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await invoke<string>("execute_git_manager_release_cmd", {
        path: repoPath,
        newVersion: cleanVer,
        mergeFromDev: isDev ? mergeFromDev : false,
        pushToOrigin,
      });

      onClose();
      onReleaseSuccess(cleanVer);
    } catch (err: unknown) {
      console.error("Error al lanzar la release:", err);
      setError(typeof err === "string" ? err : JSON.stringify(err));
      setSubmitting(false);
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
                  Lanzar Nueva Versión
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-500/30">
                  Git-Manager Oficial
                </span>
              </div>
              <p className="text-[11px] text-[#8b949e]">
                Automatiza el cambio de versión, commit, etiqueta y despliegue a GitHub Actions.
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

          {/* Pending PRs or In-Progress Actions notice */}
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
                ⚠️ Estás en una rama no estándar. Se recomienda cambiar a 'main' o 'dev' antes de lanzar una versión.
              </p>
            )}
          </div>

          {/* Semantic Version Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#8b949e]">
                Incremento de Versión (Actual: v{currentVersion}):
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedVersion(semverSuggestions.patch);
                  setIsCustom(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  !isCustom && selectedVersion === semverSuggestions.patch
                    ? "bg-emerald-950/40 border-emerald-500 text-white shadow-xs"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                }`}
              >
                <div className="text-[10px] text-emerald-400 font-semibold uppercase">
                  Patch (Bugs)
                </div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">
                  v{semverSuggestions.patch}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVersion(semverSuggestions.minor);
                  setIsCustom(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  !isCustom && selectedVersion === semverSuggestions.minor
                    ? "bg-sky-950/40 border-sky-500 text-white shadow-xs"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                }`}
              >
                <div className="text-[10px] text-sky-400 font-semibold uppercase">
                  Minor (Features)
                </div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">
                  v{semverSuggestions.minor}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVersion(semverSuggestions.major);
                  setIsCustom(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  !isCustom && selectedVersion === semverSuggestions.major
                    ? "bg-purple-950/40 border-purple-500 text-white shadow-xs"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                }`}
              >
                <div className="text-[10px] text-purple-400 font-semibold uppercase">
                  Major (Breaking)
                </div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">
                  v{semverSuggestions.major}
                </div>
              </button>
            </div>

            {/* Custom version input */}
            <div className="mt-2.5">
              <label className="flex items-center gap-2 text-xs text-[#8b949e] cursor-pointer mb-1">
                <input
                  type="checkbox"
                  checked={isCustom}
                  onChange={(e) => setIsCustom(e.target.checked)}
                  className="rounded border-[#30363d] text-purple-500 focus:ring-0"
                />
                <span>Especificar versión personalizada manualmente:</span>
              </label>

              {isCustom && (
                <input
                  type="text"
                  placeholder="ej. 0.5.0-beta.1"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-lg text-white font-mono focus:outline-hidden focus:border-purple-500"
                />
              )}
            </div>
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
                  Dispara el pipeline de GitHub Actions para compilar los instaladores .deb y .AppImage de forma automática.
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
              disabled={submitting || !finalVersion}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer shadow-lg shadow-purple-900/30 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando v{finalVersion}...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Lanzar v{finalVersion}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
