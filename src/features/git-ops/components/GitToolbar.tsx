import React, { useState } from "react";
import {
  Download,
  ArrowDownCircle,
  ArrowUpCircle,
  GitBranch,
  Archive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";

interface GitToolbarProps {
  operating: boolean;
  activeOp: string | null;
  message: string | null;
  error: string | null;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onOpenCreateBranch: () => void;
  onStash: () => void;
  onPopStash: () => void;
  onClearNotification: () => void;
}

export const GitToolbar: React.FC<GitToolbarProps> = ({
  operating,
  activeOp,
  message,
  error,
  onFetch,
  onPull,
  onPush,
  onOpenCreateBranch,
  onStash,
  onPopStash,
  onClearNotification,
}) => {
  const [stashMenuOpen, setStashMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 relative select-none">
      {/* Fetch Button */}
      <button
        onClick={onFetch}
        disabled={operating}
        title="Fetch: Descargar commits y referencias remotas sin fusionar"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors disabled:opacity-50"
      >
        <Download
          className={`w-3.5 h-3.5 text-sky-400 ${
            operating && activeOp === "Fetch" ? "animate-bounce" : ""
          }`}
        />
        <span>Fetch</span>
      </button>

      {/* Pull Button */}
      <button
        onClick={onPull}
        disabled={operating}
        title="Pull: Traer e incorporar cambios de la rama remota"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors disabled:opacity-50"
      >
        <ArrowDownCircle
          className={`w-3.5 h-3.5 text-emerald-400 ${
            operating && activeOp === "Pull" ? "animate-spin" : ""
          }`}
        />
        <span>Pull</span>
      </button>

      {/* Push Button */}
      <button
        onClick={onPush}
        disabled={operating}
        title="Push: Subir commits locales al repositorio remoto en GitHub"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors disabled:opacity-50"
      >
        <ArrowUpCircle
          className={`w-3.5 h-3.5 text-indigo-400 ${
            operating && activeOp === "Push" ? "animate-spin" : ""
          }`}
        />
        <span>Push</span>
      </button>

      <div className="h-4 w-[1px] bg-[#30363d] mx-1" />

      {/* Branch Button */}
      <button
        onClick={onOpenCreateBranch}
        disabled={operating}
        title="Crear una nueva rama a partir de HEAD"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors disabled:opacity-50"
      >
        <GitBranch className="w-3.5 h-3.5 text-purple-400" />
        <span>Branch</span>
      </button>

      {/* Stash Dropdown Button */}
      <div className="relative">
        <div className="flex items-center rounded bg-[#21262d] border border-[#30363d]">
          <button
            onClick={onStash}
            disabled={operating}
            title="Stash: Guardar temporalmente cambios en el directorio de trabajo"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-l text-xs font-medium text-[#c9d1d9] hover:text-white hover:bg-[#30363d] transition-colors disabled:opacity-50"
          >
            <Archive
              className={`w-3.5 h-3.5 text-amber-400 ${
                operating && activeOp?.includes("Stash") ? "animate-pulse" : ""
              }`}
            />
            <span>Stash</span>
          </button>
          <button
            onClick={() => setStashMenuOpen(!stashMenuOpen)}
            disabled={operating}
            className="px-1 py-1 text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded-r border-l border-[#30363d] transition-colors"
            title="Opciones de Stash"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {stashMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-36 bg-[#161b22] border border-[#30363d] rounded shadow-xl py-1 z-50 text-xs">
            <button
              onClick={() => {
                setStashMenuOpen(false);
                onStash();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2"
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span>Guardar Stash</span>
            </button>
            <button
              onClick={() => {
                setStashMenuOpen(false);
                onPopStash();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#1f6feb]/20 text-[#c9d1d9] hover:text-white flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pop Stash</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Status Notification Toast */}
      {(message || error || operating) && (
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs border ml-2 animate-in fade-in duration-200 ${
            operating
              ? "bg-blue-950/40 border-blue-500/50 text-blue-300"
              : error
              ? "bg-rose-950/40 border-rose-500/50 text-rose-300"
              : "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
          }`}
        >
          {operating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
          ) : error ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}

          <span className="truncate max-w-xs font-mono text-[11px]">
            {operating ? `Ejecutando ${activeOp}...` : error || message}
          </span>

          {!operating && (
            <button
              onClick={onClearNotification}
              className="p-0.5 hover:text-white rounded ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
