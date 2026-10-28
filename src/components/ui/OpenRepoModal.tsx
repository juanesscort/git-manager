import React, { useState } from "react";
import {
  FolderGit2,
  FolderOpen,
  Cloud,
  Clock,
  Download,
  AlertCircle,
  X,
  Lock,
  Globe,
  RefreshCw,
  FolderPlus,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./Button";
import { RemoteRepo, GitHubUser } from "../../types/git";

interface OpenRepoModalProps {
  isOpen: boolean;
  recentRepos: string[];
  gitHubRepos: RemoteRepo[];
  gitHubUser: GitHubUser | null;
  onClose: () => void;
  onOpenRepo: (path: string, customName?: string) => Promise<{ success: boolean; error?: string }>;
  onClearRecent: () => void;
}

export const OpenRepoModal: React.FC<OpenRepoModalProps> = ({
  isOpen,
  recentRepos,
  gitHubRepos,
  gitHubUser,
  onClose,
  onOpenRepo,
  onClearRecent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"local" | "github" | "recent">("local");
  const [localPath, setLocalPath] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clone from GitHub state
  const [cloningRepoId, setCloningRepoId] = useState<number | null>(null);
  const [cloneDestination, setCloneDestination] = useState<string>(
    "/home/juanesscort/Proyectos"
  );
  const [cloneError, setCloneError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePickFolder = async () => {
    try {
      setLoading(true);
      setValidationError(null);
      const chosenPath = await invoke<string | null>("pick_folder_dialog_cmd");
      if (chosenPath) {
        setLocalPath(chosenPath);
        // Automatically try to open if chosen
        const res = await onOpenRepo(chosenPath);
        if (res.success) {
          onClose();
        } else {
          setValidationError(res.error || "No es un repositorio Git válido.");
        }
      }
    } catch (err: unknown) {
      setValidationError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPath.trim()) return;

    setLoading(true);
    setValidationError(null);
    const res = await onOpenRepo(localPath.trim());
    setLoading(false);

    if (res.success) {
      setLocalPath("");
      onClose();
    } else {
      setValidationError(res.error || "La ruta indicada no contiene un repositorio Git válido.");
    }
  };

  const handleCloneRepo = async (repo: RemoteRepo) => {
    const targetDir = `${cloneDestination.replace(/\/+$/, "")}/${repo.name}`;
    setCloningRepoId(repo.id);
    setCloneError(null);

    try {
      await invoke<string>("clone_repo_cmd", {
        cloneUrl: repo.clone_url,
        targetPath: targetDir,
      });

      // Once cloned, open it in a tab!
      const res = await onOpenRepo(targetDir, repo.name);
      if (res.success) {
        onClose();
      } else {
        setCloneError(res.error || "Repositorio clonado pero falló al abrir.");
      }
    } catch (err: unknown) {
      const errStr = typeof err === "string" ? err : JSON.stringify(err);
      setCloneError(`Error al clonar: ${errStr}`);
    } finally {
      setCloningRepoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <FolderPlus className="w-4 h-4 text-blue-400" />
            <span>Abrir o Clonar Repositorio</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Subtabs */}
        <div className="flex items-center px-4 pt-2 border-b border-[#30363d] bg-[#161b22] gap-2">
          <button
            onClick={() => setActiveSubTab("local")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === "local"
                ? "border-blue-500 text-white"
                : "border-transparent text-[#8b949e] hover:text-white"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Abrir Local</span>
          </button>

          <button
            onClick={() => setActiveSubTab("github")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === "github"
                ? "border-blue-500 text-white"
                : "border-transparent text-[#8b949e] hover:text-white"
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-purple-400" />
            <span>Clonar de GitHub {gitHubRepos.length > 0 && `(${gitHubRepos.length})`}</span>
          </button>

          <button
            onClick={() => setActiveSubTab("recent")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSubTab === "recent"
                ? "border-blue-500 text-white"
                : "border-transparent text-[#8b949e] hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Recientes ({recentRepos.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Subtab 1: Abrir Local */}
          {activeSubTab === "local" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#30363d] rounded-xl hover:border-blue-500/60 transition-colors bg-[#0d1117]/50 text-center gap-3">
                <FolderOpen className="w-10 h-10 text-blue-400/80 animate-pulse" />
                <div>
                  <h3 className="text-white font-medium text-xs">Selecciona un proyecto existente</h3>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Abre cualquier carpeta en tu equipo que tenga Git inicializado (.git).
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handlePickFolder}
                  disabled={loading}
                  icon={<FolderOpen className="w-3.5 h-3.5" />}
                >
                  {loading ? "Abriendo selector..." : "Examinar Carpetas en el Sistema..."}
                </Button>
              </div>

              <div className="flex items-center gap-3 my-1">
                <div className="h-[1px] bg-[#30363d] flex-1" />
                <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">
                  o escribe la ruta absoluta
                </span>
                <div className="h-[1px] bg-[#30363d] flex-1" />
              </div>

              <form onSubmit={handleOpenLocalSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                    Ruta del repositorio:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      placeholder="/home/usuario/proyectos/mi-proyecto"
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      type="submit"
                      disabled={!localPath.trim() || loading}
                    >
                      Abrir
                    </Button>
                  </div>
                </div>

                {validationError && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{validationError}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Subtab 2: Clonar de GitHub */}
          {activeSubTab === "github" && (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-col gap-1.5">
                <label className="block text-[11px] font-medium text-[#8b949e]">
                  Carpeta de destino para clones:
                </label>
                <input
                  type="text"
                  value={cloneDestination}
                  onChange={(e) => setCloneDestination(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {cloneError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{cloneError}</span>
                </div>
              )}

              {!gitHubUser ? (
                <div className="text-center p-8 text-[#8b949e] text-xs">
                  <Cloud className="w-10 h-10 mb-2 opacity-30 text-purple-400 mx-auto" />
                  <p>Inicia sesión con GitHub en la barra superior para ver y clonar tus repositorios.</p>
                </div>
              ) : gitHubRepos.length === 0 ? (
                <div className="text-center p-8 text-[#8b949e] text-xs">
                  <p>No se encontraron repositorios o cargando...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                  {gitHubRepos.map((repo) => {
                    const isCloningThis = cloningRepoId === repo.id;

                    return (
                      <div
                        key={repo.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-[#30363d] bg-[#0d1117] hover:border-purple-500/50 transition-colors"
                      >
                        <div className="flex flex-col overflow-hidden mr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs truncate">
                              {repo.name}
                            </span>
                            {repo.private ? (
                              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-300 border border-amber-800">
                                <Lock className="w-2.5 h-2.5" /> Privado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-blue-950/50 text-blue-300 border border-blue-800">
                                <Globe className="w-2.5 h-2.5" /> Público
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-[11px] text-[#8b949e] truncate mt-0.5">
                              {repo.description}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCloneRepo(repo)}
                          disabled={cloningRepoId !== null}
                          className="shrink-0 h-7 text-xs bg-[#21262d] hover:bg-purple-900/40 text-purple-200 border-purple-500/30"
                          icon={
                            isCloningThis ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-purple-400" />
                            )
                          }
                        >
                          {isCloningThis ? "Clonando..." : "Clonar y Abrir"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subtab 3: Recientes */}
          {activeSubTab === "recent" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#30363d]">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                  Historial de Repositorios
                </span>
                {recentRepos.length > 0 && (
                  <button
                    onClick={onClearRecent}
                    className="text-[11px] text-[#8b949e] hover:text-rose-400 transition-colors"
                  >
                    Borrar historial
                  </button>
                )}
              </div>

              {recentRepos.length === 0 ? (
                <p className="text-xs text-[#8b949e] italic p-6 text-center">
                  Aún no has abierto repositorios recientemente.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                  {recentRepos.map((path) => {
                    const name = path.split("/").filter(Boolean).pop() || path;

                    return (
                      <div
                        key={path}
                        onClick={async () => {
                          const res = await onOpenRepo(path);
                          if (res.success) onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] hover:border-blue-500/50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                          <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
                          <div className="flex flex-col truncate">
                            <span className="font-semibold text-white text-xs group-hover:text-blue-300">
                              {name}
                            </span>
                            <span className="text-[10px] text-[#8b949e] font-mono truncate">
                              {path}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] text-blue-400 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded font-medium shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          Abrir Pestaña
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
