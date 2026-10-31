import React, { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  GitBranch,
  Archive,
  RefreshCw,
  Terminal,
  Download,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  GitPullRequest,
  PlayCircle,
  RotateCw,
  Rocket,
} from "lucide-react";

interface GitToolbarProps {
  operating: boolean;
  activeOp: string | null;
  message: string | null;
  error: string | null;
  isTerminalOpen?: boolean;
  aheadCount?: number;
  behindCount?: number;
  hasUpstream?: boolean;
  hasUncommittedChanges?: boolean;
  openPrCount?: number;
  activeRunsCount?: number;
  actionsStatus?: string | null;
  isGitManagerRepo?: boolean;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onOpenCreateBranch: () => void;
  onStash: () => void;
  onPopStash: () => void;
  onToggleTerminal?: () => void;
  onOpenPullRequests?: () => void;
  onOpenActions?: () => void;
  onOpenReleaseWizard?: () => void;
  onShowBanner?: (error: string) => void;
  onClearNotification: () => void;
}

export const GitToolbar: React.FC<GitToolbarProps> = ({
  operating,
  activeOp,
  message,
  error,
  isTerminalOpen = false,
  aheadCount = 0,
  behindCount = 0,
  openPrCount = 0,
  activeRunsCount = 0,
  actionsStatus = null,
  isGitManagerRepo = false,
  hasUpstream = false,
  hasUncommittedChanges = false,
  onFetch,
  onPull,
  onPush,
  onOpenCreateBranch,
  onStash,
  onPopStash,
  onToggleTerminal,
  onOpenPullRequests,
  onOpenActions,
  onOpenReleaseWizard,
  onShowBanner,
  onClearNotification,
}) => {
  const [stashMenuOpen, setStashMenuOpen] = useState(false);

  // Push is disabled if already operating, or if there is an upstream and aheadCount === 0
  const isPushDisabled = operating || (hasUpstream && aheadCount === 0);
  const pushTitle = operating
    ? "Operación en progreso..."
    : hasUpstream
    ? aheadCount > 0
      ? `Push: Subir ${aheadCount} commit(s) pendientes al repositorio remoto`
      : "Al día: No hay commits locales nuevos para subir (Push)"
    : "Push: Publicar rama actual en el repositorio remoto";

  // Pull is disabled if operating, or if no upstream exists, or if behindCount === 0
  const isPullDisabled = operating || !hasUpstream || behindCount === 0;
  const pullTitle = operating
    ? "Operación en progreso..."
    : !hasUpstream
    ? "No hay una rama remota rastreada para hacer Pull"
    : behindCount > 0
    ? `Pull: Incorporar ${behindCount} commit(s) nuevos del repositorio remoto`
    : "Al día: No hay commits nuevos en el repositorio remoto (Pull)";

  // Stash is disabled if operating or no uncommitted changes
  const isStashDisabled = operating || !hasUncommittedChanges;
  const stashTitle = operating
    ? "Operación en progreso..."
    : !hasUncommittedChanges
    ? "No hay cambios pendientes de preparar o confirmar para guardar en Stash"
    : "Stash: Apartar cambios en curso para limpiar el árbol de trabajo";

  return (
    <div className="flex items-center gap-1 relative select-none">
      {/* Fetch Button (Icon on top, text below) */}
      <button
        onClick={onFetch}
        disabled={operating}
        title="Fetch: Descargar referencias remotas sin fusionar"
        className="flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group disabled:opacity-50"
      >
        <Download
          className={`w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform ${
            operating && activeOp === "Fetch" ? "animate-bounce" : ""
          }`}
        />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Fetch</span>
      </button>

      {/* Pull Button */}
      <button
        onClick={onPull}
        disabled={isPullDisabled}
        title={pullTitle}
        className="flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed relative"
      >
        <div className="relative">
          <ArrowDownCircle
            className={`w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform ${
              operating && activeOp === "Pull" ? "animate-pulse" : ""
            } ${isPullDisabled ? "text-gray-500" : ""}`}
          />
          {behindCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-black text-[9px] font-bold px-1 rounded-full font-mono leading-tight shadow-xs">
              {behindCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Pull</span>
      </button>

      {/* Push Button */}
      <button
        onClick={onPush}
        disabled={isPushDisabled}
        title={pushTitle}
        className="flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed relative"
      >
        <div className="relative">
          <ArrowUpCircle
            className={`w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform ${
              operating && activeOp === "Push" ? "animate-pulse" : ""
            } ${isPushDisabled ? "text-gray-500" : ""}`}
          />
          {aheadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-indigo-500 text-white text-[9px] font-bold px-1 rounded-full font-mono leading-tight shadow-xs">
              {aheadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Push</span>
      </button>

      <div className="h-6 w-[1px] bg-[#30363d]/70 mx-1" />

      {/* Branch Button */}
      <button
        onClick={onOpenCreateBranch}
        disabled={operating}
        title="Crear una nueva rama a partir de HEAD"
        className="flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group disabled:opacity-50"
      >
        <GitBranch className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Branch</span>
      </button>

      {/* Stash Button with Menu */}
      <div className="relative">
        <div className="flex items-center h-10 rounded hover:bg-[#21262d] transition-colors group">
          <button
            onClick={onStash}
            disabled={isStashDisabled}
            title={stashTitle}
            className="flex flex-col items-center justify-center h-full px-2 text-[#8b949e] hover:text-[#c9d1d9] min-w-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Archive
              className={`w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform ${
                operating && activeOp?.includes("Stash") ? "animate-pulse" : ""
              } ${isStashDisabled ? "text-gray-500" : ""}`}
            />
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Stash</span>
          </button>
          <button
            onClick={() => setStashMenuOpen(!stashMenuOpen)}
            disabled={operating}
            className="h-full px-1 flex items-center text-[#484f58] hover:text-white"
            title="Opciones de Stash"
          >
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>

        {stashMenuOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 pb-2 mb-1 border-b border-[#30363d]/70">
              <span className="font-semibold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-amber-400" /> Operaciones de Stash
              </span>
            </div>

            <button
              onClick={() => {
                setStashMenuOpen(false);
                onStash();
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#21262d] transition-colors flex items-start gap-2.5 group"
            >
              <div className="p-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 mt-0.5 shrink-0">
                <Archive className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-white group-hover:text-amber-300">
                  Guardar en Stash (Push)
                </span>
                <span className="text-[10px] text-[#8b949e] leading-snug mt-0.5">
                  Aparta tus cambios sin hacer commit para limpiar el árbol.
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setStashMenuOpen(false);
                onPopStash();
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#21262d] transition-colors flex items-start gap-2.5 group mt-1"
            >
              <div className="p-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 mt-0.5 shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-white group-hover:text-emerald-300">
                  Recuperar Stash (Pop)
                </span>
                <span className="text-[10px] text-[#8b949e] leading-snug mt-0.5">
                  Restaura los últimos cambios apartados en tu espacio de trabajo.
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="h-6 w-[1px] bg-[#30363d]/70 mx-1" />

      {/* Terminal Button (Flecha 1) */}
      <button
        onClick={onToggleTerminal}
        title="Terminal: Abrir/Cerrar terminal integrada de Linux"
        className={`flex flex-col items-center justify-center h-10 px-2.5 rounded transition-all min-w-[46px] group cursor-pointer ${
          isTerminalOpen
            ? "bg-cyan-950/60 text-cyan-200 border border-cyan-500/40"
            : "hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]"
        }`}
      >
        <Terminal
          className={`w-4 h-4 ${
            isTerminalOpen ? "text-cyan-400" : "text-cyan-400/80 group-hover:scale-110"
          } transition-transform`}
        />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Terminal</span>
      </button>

      {/* Pull Requests Hub Button with Dynamic Counter Badge */}
      {onOpenPullRequests && (
        <button
          onClick={onOpenPullRequests}
          title={
            openPrCount > 0
              ? `Pull Requests: ${openPrCount} solicitud(es) abierta(s) en GitHub`
              : "Pull Requests: Ver, revisar y aprobar solicitudes de GitHub"
          }
          className="relative flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <GitPullRequest className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            {openPrCount > 0 && (
              <span
                className="absolute -top-1.5 -right-3 px-1 min-w-[15px] h-[15px] flex items-center justify-center text-[9px] font-mono font-bold rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-xs animate-in zoom-in-75 duration-150"
                title={`${openPrCount} Pull Request(s) abierto(s)`}
              >
                {openPrCount > 99 ? "99+" : openPrCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">PRs</span>
        </button>
      )}

      {/* GitHub Actions CI/CD Button */}
      {onOpenActions && (
        <button
          onClick={onOpenActions}
          title={
            activeRunsCount > 0
              ? `GitHub Actions: ${activeRunsCount} pipeline(s) en ejecución`
              : actionsStatus === "failure"
              ? "GitHub Actions: La última ejecución falló"
              : actionsStatus === "success"
              ? "GitHub Actions: Pipelines completados con éxito"
              : "GitHub Actions: Monitorear flujos de trabajo, jobs y logs"
          }
          className="relative flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            {actionsStatus === "in_progress" || activeRunsCount > 0 ? (
              <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
            ) : actionsStatus === "failure" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            ) : actionsStatus === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            ) : (
              <PlayCircle className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            )}
            {activeRunsCount > 0 && (
              <span
                className="absolute -top-1.5 -right-3 px-1 min-w-[15px] h-[15px] flex items-center justify-center text-[9px] font-mono font-bold rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-xs animate-in zoom-in-75 duration-150"
                title={`${activeRunsCount} workflow(s) en ejecución`}
              >
                {activeRunsCount > 99 ? "99+" : activeRunsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Actions</span>
        </button>
      )}

      {/* Release Wizard Button (Exclusive for Git-Manager Repo) */}
      {isGitManagerRepo && onOpenReleaseWizard && (() => {
        const isReleaseDisabled = hasUncommittedChanges || activeRunsCount > 0 || operating;
        return (
          <button
            onClick={() => {
              if (hasUncommittedChanges) {
                if (onShowBanner) {
                  onShowBanner(
                    "El espacio de trabajo tiene cambios pendientes. Realiza commit o stash antes de lanzar una versión."
                  );
                }
                return;
              }
              if (activeRunsCount > 0) {
                if (onShowBanner) {
                  onShowBanner(
                    `Hay ${activeRunsCount} flujo(s) de Actions en ejecución. Espera a que termine antes de lanzar otra release.`
                  );
                }
                return;
              }
              onOpenReleaseWizard();
            }}
            disabled={isReleaseDisabled}
            title={
              hasUncommittedChanges
                ? "Release bloqueada: Tienes cambios pendientes de confirmar en el espacio de trabajo. Haz commit o stash primero."
                : activeRunsCount > 0
                ? `Release bloqueada: Hay ${activeRunsCount} pipeline(s) de GitHub Actions en ejecución. Espera a que finalice.`
                : openPrCount > 0
                ? `Atención: Hay ${openPrCount} Pull Request(s) pendientes de revisión. Haz clic para configurar la release.`
                : "Lanzar Release: Automatizar nueva versión oficial de Git-Manager"
            }
            className={`relative flex flex-col items-center justify-center h-10 px-2.5 rounded transition-all min-w-[46px] group ml-1 ${
              isReleaseDisabled
                ? "bg-[#21262d]/40 border border-[#30363d] text-[#8b949e] opacity-50 cursor-not-allowed"
                : "bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-500/40 cursor-pointer"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Rocket
                className={`w-4 h-4 ${
                  isReleaseDisabled
                    ? "text-[#8b949e]"
                    : "text-purple-400 group-hover:scale-110 group-hover:-translate-y-0.5"
                } transition-transform`}
              />

              {/* Only show warning badge if uncommitted changes exist */}
              {hasUncommittedChanges && (
                <span
                  className="absolute -top-1 -right-2 px-1 min-w-[13px] h-[13px] flex items-center justify-center text-[8px] font-mono font-bold rounded-full bg-amber-500 text-black shadow-xs"
                  title="Cambios pendientes sin confirmar"
                >
                  !
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">Release</span>
          </button>
        );
      })()}

      {/* Floating Status / Error Notifications */}
      {message && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-200 text-xs shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate max-w-sm">{message}</span>
          <button
            onClick={onClearNotification}
            className="p-0.5 hover:text-white rounded ml-1 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex flex-col p-3 rounded-lg bg-[#161b22] border border-rose-500/50 text-rose-200 text-xs shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 min-w-[340px] max-w-xl">
          <div className="flex items-start justify-between gap-2 mb-1.5 border-b border-rose-500/20 pb-1.5">
            <div className="flex items-center gap-2 font-semibold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Notificación de Operación Git</span>
            </div>
            <button
              onClick={onClearNotification}
              className="p-1 hover:text-white rounded hover:bg-[#21262d] text-[#8b949e] transition-colors"
              title="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="font-mono text-[11px] text-[#c9d1d9] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto pr-1">
            {error}
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#30363d]/50 flex justify-end gap-2 items-center">
            <button
              onClick={() => {
                navigator.clipboard.writeText(error);
                onClearNotification();
              }}
              className="text-[10px] text-[#8b949e] hover:text-white underline mr-1"
            >
              Copiar detalle
            </button>
            <button
              onClick={onClearNotification}
              className="px-2.5 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] transition-colors font-medium border border-[#30363d]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
