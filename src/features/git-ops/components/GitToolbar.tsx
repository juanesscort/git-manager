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
} from "lucide-react";

interface GitToolbarProps {
  operating: boolean;
  activeOp: string | null;
  message: string | null;
  error: string | null;
  isTerminalOpen?: boolean;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onOpenCreateBranch: () => void;
  onStash: () => void;
  onPopStash: () => void;
  onToggleTerminal?: () => void;
  onClearNotification: () => void;
}

export const GitToolbar: React.FC<GitToolbarProps> = ({
  operating,
  activeOp,
  message,
  error,
  isTerminalOpen = false,
  onFetch,
  onPull,
  onPush,
  onOpenCreateBranch,
  onStash,
  onPopStash,
  onToggleTerminal,
  onClearNotification,
}) => {
  const [stashMenuOpen, setStashMenuOpen] = useState(false);

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
        disabled={operating}
        title="Pull: Traer e incorporar cambios de la rama remota"
        className="flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group disabled:opacity-50"
      >
        <ArrowDownCircle
          className={`w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform ${
            operating && activeOp === "Pull" ? "animate-pulse" : ""
          }`}
        />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Pull</span>
      </button>

      {/* Push Button */}
      <button
        onClick={onPush}
        disabled={operating}
        title="Push: Subir commits locales al repositorio remoto"
        className="flex flex-col items-center justify-center h-10 px-2.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] transition-all min-w-[46px] group disabled:opacity-50"
      >
        <ArrowUpCircle
          className={`w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform ${
            operating && activeOp === "Push" ? "animate-pulse" : ""
          }`}
        />
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
            disabled={operating}
            title="Stash: Guardar temporalmente cambios del directorio de trabajo"
            className="flex flex-col items-center justify-center h-full px-2 text-[#8b949e] hover:text-[#c9d1d9] min-w-[44px]"
          >
            <Archive
              className={`w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform ${
                operating && activeOp?.includes("Stash") ? "animate-pulse" : ""
              }`}
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
        className={`flex flex-col items-center justify-center h-10 px-2.5 rounded transition-all min-w-[46px] group ${
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
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-500/50 text-rose-200 text-xs shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate max-w-sm">{error}</span>
          <button
            onClick={onClearNotification}
            className="p-0.5 hover:text-white rounded ml-1 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
