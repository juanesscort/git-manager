import React from "react";
import {
  GitCommit,
  Sparkles,
  X,
  AlertTriangle,
  Layers,
  FileCode,
  Check,
  Minimize2,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FileStatusItem } from "../../../types/git";

interface CommitEditorModalProps {
  isOpen: boolean;
  commitTitle: string;
  commitDescription: string;
  stagedFiles: FileStatusItem[];
  currentBranch?: string | null;
  aiGenerating?: boolean;
  aiError?: string | null;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onGenerateAiCommit?: () => void;
  onCommit: () => void;
  onClose: () => void;
  onOpenAiConfig?: () => void;
}

const CONVENTIONAL_TYPES = [
  { type: "feat", label: "feat: nueva funcionalidad", color: "bg-blue-950/60 text-blue-300 border-blue-500/40" },
  { type: "fix", label: "fix: corrección de bug", color: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40" },
  { type: "refactor", label: "refactor: refactorización", color: "bg-purple-950/60 text-purple-300 border-purple-500/40" },
  { type: "docs", label: "docs: documentación", color: "bg-amber-950/60 text-amber-300 border-amber-500/40" },
  { type: "chore", label: "chore: mantenimiento", color: "bg-slate-800 text-slate-300 border-slate-600" },
  { type: "perf", label: "perf: rendimiento", color: "bg-rose-950/60 text-rose-300 border-rose-500/40" },
  { type: "test", label: "test: pruebas unitarias", color: "bg-cyan-950/60 text-cyan-300 border-cyan-500/40" },
];

export const CommitEditorModal: React.FC<CommitEditorModalProps> = ({
  isOpen,
  commitTitle,
  commitDescription,
  stagedFiles,
  currentBranch,
  aiGenerating = false,
  aiError = null,
  onChangeTitle,
  onChangeDescription,
  onGenerateAiCommit,
  onCommit,
  onClose,
  onOpenAiConfig,
}) => {
  if (!isOpen) return null;

  const handleTypeSelect = (typePrefix: string) => {
    if (!commitTitle.trim()) {
      onChangeTitle(`${typePrefix}: `);
    } else if (!commitTitle.includes(":")) {
      onChangeTitle(`${typePrefix}: ${commitTitle}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (stagedFiles.length > 0 && commitTitle.trim()) {
        e.preventDefault();
        onCommit();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-3xl bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[82vh] max-h-[750px]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-950/70 border border-blue-500/40 text-blue-400">
              <GitCommit className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Editor Ampliado de Commit
              </h2>
              {currentBranch && (
                <Badge
                  label={currentBranch}
                  variant="purple"
                />
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300">
                {stagedFiles.length} archivo(s) preparados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors cursor-pointer"
              title="Minimizar al panel lateral (Esc)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#30363d] transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Quick Conventional Commits Type Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider mr-1">
              Prefijo rápido:
            </span>
            {CONVENTIONAL_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleTypeSelect(item.type)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer hover:scale-105 ${item.color}`}
                title={`Insertar ${item.type}: al título`}
              >
                {item.type}
              </button>
            ))}
          </div>

          {/* AI Generation Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-white text-xs block">
                  Asistente de Commits con Inteligencia Artificial
                </span>
                <span className="text-[11px] text-[#8b949e]">
                  Analiza las diferencias preparadas (staged diffs) y genera un mensaje en español.
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant="secondary"
              disabled={stagedFiles.length === 0 || aiGenerating}
              onClick={onGenerateAiCommit}
              className="text-amber-300 border-amber-500/30 hover:border-amber-400/60 bg-amber-950/20 shrink-0"
              icon={
                <Sparkles
                  className={`w-3.5 h-3.5 ${aiGenerating ? "animate-spin text-amber-300" : ""}`}
                />
              }
            >
              {aiGenerating ? "Analizando cambios..." : "Generar con IA"}
            </Button>
          </div>

          {/* AI Error Alert */}
          {aiError && (
            <div className="bg-rose-950/50 border border-rose-500/50 rounded-lg p-3 text-xs flex flex-col gap-1.5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Error al generar commit con IA</span>
                </div>
              </div>
              <p className="text-[11px] text-rose-200 font-mono break-words leading-relaxed">
                {aiError}
              </p>
              {onOpenAiConfig && (
                <button
                  type="button"
                  onClick={onOpenAiConfig}
                  className="self-start text-[11px] font-medium text-amber-300 hover:text-amber-200 underline mt-0.5 cursor-pointer"
                >
                  Abrir Ajustes de IA para verificar API Key o Modelo →
                </button>
              )}
            </div>
          )}

          {/* Commit Title Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                <span>Título del Commit</span>
                <span className="text-rose-400 font-bold">*</span>
              </label>

              <span
                className={`text-[10px] font-mono ${
                  commitTitle.length > 72
                    ? "text-amber-400 font-bold"
                    : commitTitle.length > 50
                    ? "text-[#8b949e]"
                    : "text-[#484f58]"
                }`}
              >
                {commitTitle.length}/72 caracteres recomendados
              </span>
            </div>

            <input
              type="text"
              autoFocus
              value={commitTitle}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="feat(alcance): resumen conciso del cambio en español..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden font-mono shadow-inner"
            />
          </div>

          {/* Commit Description Field - Spacious & Resizable */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-[160px]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                Descripción Detallada (Opcional)
              </label>
              <span className="text-[10px] text-[#484f58]">
                Markdown y listas con guiones soportados
              </span>
            </div>

            <textarea
              value={commitDescription}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Detalles adicionales, contexto del problema resuelto, notas de migración o listas de cambios:&#10;&#10;- Ajuste en la visualización del grafo&#10;- Corrección de márgenes y bordes&#10;- Soporte para redimensión vertical"
              className="w-full flex-1 min-h-[140px] bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden resize-none font-mono leading-relaxed shadow-inner"
            />
          </div>

          {/* Staged Files Preview Strip */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Archivos incluidos en este commit ({stagedFiles.length})</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {stagedFiles.map((f) => (
                <div
                  key={f.path}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[10px] font-mono text-[#c9d1d9] shrink-0"
                  title={f.path}
                >
                  <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[160px]">{f.path.split("/").pop()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#30363d] flex items-center justify-between bg-[#0d1117] shrink-0">
          <div className="text-[11px] text-[#8b949e] flex items-center gap-1.5 font-mono">
            <span>Atajo:</span>
            <kbd className="px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[10px] text-white">
              Ctrl + Enter
            </kbd>
            <span>para confirmar</span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Minimizar
            </Button>

            <Button
              size="sm"
              variant="primary"
              disabled={stagedFiles.length === 0 || !commitTitle.trim()}
              onClick={onCommit}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Confirmar Commit ({stagedFiles.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
