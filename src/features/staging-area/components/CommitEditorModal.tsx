import React, { useState } from "react";
import {
  GitCommit,
  Sparkles,
  X,
  AlertTriangle,
  Check,
  Minimize2,
  Tag,
  TagPlus,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FileStatusItem } from "../../../types/git";

interface CommitEditorModalProps {
  isOpen: boolean;
  commitTitle: string;
  commitDescription: string;
  commitTag?: string;
  commitTagMessage?: string;
  stagedFiles: FileStatusItem[];
  currentBranch?: string | null;
  aiGenerating?: boolean;
  aiError?: string | null;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onChangeTag?: (tag: string) => void;
  onChangeTagMessage?: (msg: string) => void;
  onGenerateAiCommit?: () => void;
  onCommit: () => void;
  onClose: () => void;
  onOpenAiConfig?: () => void;
}

const CONVENTIONAL_TYPES = [
  { type: "feat", label: "feat: nueva funcionalidad" },
  { type: "fix", label: "fix: corrección de bug" },
  { type: "refactor", label: "refactor: refactorización" },
  { type: "docs", label: "docs: documentación" },
  { type: "chore", label: "chore: mantenimiento" },
  { type: "perf", label: "perf: rendimiento" },
  { type: "test", label: "test: pruebas unitarias" },
];

const CONVENTIONAL_REGEX = /^(feat|fix|refactor|docs|chore|perf|test)(\([^)]+\))?:\s*/i;

export const CommitEditorModal: React.FC<CommitEditorModalProps> = ({
  isOpen,
  commitTitle,
  commitDescription,
  commitTag,
  commitTagMessage,
  stagedFiles,
  currentBranch,
  aiGenerating = false,
  aiError = null,
  onChangeTitle,
  onChangeDescription,
  onChangeTag,
  onChangeTagMessage,
  onGenerateAiCommit,
  onCommit,
  onClose,
  onOpenAiConfig,
}) => {
  const [showTagFields, setShowTagFields] = useState<boolean>(
    () => Boolean(commitTag && commitTag.trim())
  );

  if (!isOpen) return null;

  // Detect active prefix and scope
  const prefixMatch = commitTitle.match(CONVENTIONAL_REGEX);
  const activeType = prefixMatch ? prefixMatch[1].toLowerCase() : null;
  const currentScope = prefixMatch && prefixMatch[2] ? prefixMatch[2] : "";

  // Flecha 5: Switch toggle logic (click active removes it, click inactive switches to it)
  const handleTogglePrefix = (type: string) => {
    if (activeType === type.toLowerCase()) {
      // Toggle OFF: remove prefix completely
      const stripped = commitTitle.replace(CONVENTIONAL_REGEX, "");
      onChangeTitle(stripped);
    } else if (activeType) {
      // Switch to new prefix, retaining scope if any
      const stripped = commitTitle.replace(CONVENTIONAL_REGEX, "");
      const newPrefix = currentScope ? `${type}${currentScope}: ` : `${type}: `;
      onChangeTitle(`${newPrefix}${stripped}`);
    } else {
      // Prepend prefix
      onChangeTitle(`${type}: ${commitTitle}`);
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
          {/* Top Bar: Dual-State Conventional Types Switches & Tag Toggle (Flechas 5 y 8) */}
          <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider mr-1">
                Prefijo rápido:
              </span>
              {CONVENTIONAL_TYPES.map((item) => {
                const isActive = activeType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleTogglePrefix(item.type)}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30 font-bold shadow-xs scale-105"
                        : "bg-[#0d1117] text-[#8b949e] hover:text-[#c9d1d9] border-[#30363d] hover:bg-[#21262d]"
                    }`}
                    title={
                      isActive
                        ? `Quitar prefijo activo ${item.type}: (dejar limpio)`
                        : `Aplicar prefijo ${item.label}`
                    }
                  >
                    {item.type}
                  </button>
                );
              })}
            </div>

            {/* Strategic TagPlus Switch Button (Flecha 8) */}
            <button
              type="button"
              onClick={() => setShowTagFields((prev) => !prev)}
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                showTagFields || (commitTag && commitTag.trim())
                  ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold shadow-xs"
                  : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]"
              }`}
              title={
                showTagFields
                  ? "Ocultar campos de etiqueta"
                  : "Crear y asignar etiqueta (tag) para este commit"
              }
            >
              <TagPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Tag / Versión</span>
            </button>
          </div>

          {/* AI Error Alert */}
          {aiError && (
            <div className="bg-rose-950/50 border border-rose-500/50 rounded-lg p-3 text-xs flex flex-col gap-1.5 shrink-0 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Aviso de IA</span>
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

          {/* Commit Title Field with Compact AI Icon Button (Flecha 6) */}
          <div className="flex flex-col gap-1.5 shrink-0">
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

            <div className="relative flex items-center">
              <input
                type="text"
                maxLength={72}
                autoFocus
                value={commitTitle}
                onChange={(e) => onChangeTitle(e.target.value)}
                placeholder="feat(alcance): resumen conciso del cambio en español..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-3 pr-10 py-2.5 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden font-mono shadow-inner"
              />
              {/* Compact AI Icon Button on right side of Title (Flecha 6) */}
              <button
                type="button"
                disabled={aiGenerating}
                onClick={onGenerateAiCommit}
                className="absolute right-2 p-1.5 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors cursor-pointer"
                title={
                  stagedFiles.length === 0
                    ? "Haz clic para saber cómo usar la IA (requiere archivos preparados)"
                    : aiGenerating
                    ? "Analizando cambios con IA..."
                    : "Generar título y descripción con IA"
                }
              >
                <Sparkles
                  className={`w-4 h-4 ${aiGenerating ? "animate-pulse text-amber-300" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Commit Description Field - Spacious & Resizable */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-[140px]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                Descripción Detallada (Opcional)
              </label>
              <span className="text-[10px] text-[#484f58]">
                Markdown y listas soportados
              </span>
            </div>

            <textarea
              value={commitDescription}
              onChange={(e) => onChangeDescription(e.target.value)}
              placeholder="Detalles adicionales, contexto del problema resuelto, notas de migración o listas de cambios:&#10;&#10;- Ajuste en la visualización del grafo&#10;- Corrección de márgenes y bordes"
              className="w-full flex-1 min-h-[120px] bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-[#484f58] focus:border-blue-500 focus:outline-hidden resize-none font-mono leading-relaxed shadow-inner"
            />
          </div>

          {/* Tag Name Input & Tag Description Textarea (Flechas 7 y 8) */}
          {showTagFields && (
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[#0d1117]/60 border border-emerald-500/30 animate-in fade-in duration-150 shrink-0">
              {/* Tag Name Input (Exact same styling as Commit Title) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Nombre de la Etiqueta (Tag)</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-[#8b949e] font-mono">
                    ej: v0.1.1, v1.0.0
                  </span>
                </div>
                <input
                  type="text"
                  value={commitTag || ""}
                  onChange={(e) => onChangeTag && onChangeTag(e.target.value)}
                  placeholder="v0.1.1"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-hidden font-mono shadow-inner"
                />
              </div>

              {/* Tag Message Textarea (Exact same styling as Commit Description) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                    Descripción / Mensaje del Tag (Opcional)
                  </label>
                  <span className="text-[10px] text-[#484f58]">
                    Para tags anotados con notas de versión
                  </span>
                </div>
                <textarea
                  value={commitTagMessage || ""}
                  onChange={(e) =>
                    onChangeTagMessage && onChangeTagMessage(e.target.value)
                  }
                  placeholder="Notas de la versión, hitos relevantes o changelog..."
                  className="w-full h-20 bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-[#484f58] focus:border-emerald-500 focus:outline-hidden resize-none font-mono leading-relaxed shadow-inner"
                />
              </div>
            </div>
          )}
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
              {commitTag && commitTag.trim()
                ? `Confirmar Commit & Tag "${commitTag.trim()}" (${stagedFiles.length})`
                : `Confirmar Commit (${stagedFiles.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
