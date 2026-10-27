import React, { useState, useEffect } from "react";
import {
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowDownRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ConflictedFileDetail } from "../../../types/git";

interface ConflictResolverModalProps {
  isOpen: boolean;
  conflict: ConflictedFileDetail | null;
  loading: boolean;
  onResolve: (filePath: string, resolvedContent: string) => Promise<void>;
  onClose: () => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  conflict,
  loading,
  onResolve,
  onClose,
}) => {
  const [editedContent, setEditedContent] = useState<string>("");
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [copiedOurs, setCopiedOurs] = useState<boolean>(false);
  const [copiedTheirs, setCopiedTheirs] = useState<boolean>(false);

  useEffect(() => {
    if (conflict) {
      setEditedContent(conflict.current_workdir_content || "");
      setActiveBlockIndex(0);
    }
  }, [conflict]);

  if (!isOpen || !conflict) return null;

  const conflictMarkerRegex = /<{7}[^\n]*\n([\s\S]*?)={7}\n([\s\S]*?)>{7}[^\n]*/g;
  const currentMarkersCount = (editedContent.match(conflictMarkerRegex) || []).length;
  const hasPendingMarkers = currentMarkersCount > 0;

  // Resolve a specific conflict hunk
  const handleResolveBlock = (index: number, choice: "ours" | "theirs" | "both") => {
    let count = 0;
    const updated = editedContent.replace(conflictMarkerRegex, (match, ours, theirs) => {
      if (count === index) {
        count++;
        if (choice === "ours") return ours;
        if (choice === "theirs") return theirs;
        if (choice === "both") return `${ours}${theirs}`;
      }
      count++;
      return match;
    });
    setEditedContent(updated);
  };

  // Resolve all remaining conflict hunks at once
  const handleResolveAll = (choice: "ours" | "theirs" | "both") => {
    const updated = editedContent.replace(conflictMarkerRegex, (_match, ours, theirs) => {
      if (choice === "ours") return ours;
      if (choice === "theirs") return theirs;
      if (choice === "both") return `${ours}${theirs}`;
      return _match;
    });
    setEditedContent(updated);
  };

  // Restore to original workdir content
  const handleReset = () => {
    setEditedContent(conflict.current_workdir_content);
  };

  const handleUseFullFile = (choice: "ours" | "theirs") => {
    if (choice === "ours") {
      setEditedContent(conflict.ours_content);
    } else {
      setEditedContent(conflict.theirs_content);
    }
  };

  const handleCopy = (text: string, type: "ours" | "theirs") => {
    navigator.clipboard.writeText(text);
    if (type === "ours") {
      setCopiedOurs(true);
      setTimeout(() => setCopiedOurs(false), 2000);
    } else {
      setCopiedTheirs(true);
      setTimeout(() => setCopiedTheirs(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (hasPendingMarkers) {
      const confirmSave = window.confirm(
        "Aún quedan marcadores de conflicto (<<<<<<< / >>>>>>>) en el archivo. ¿Deseas guardar de todos modos?"
      );
      if (!confirmSave) return;
    }
    await onResolve(conflict.path, editedContent);
  };

  const renderLineNumbers = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="select-none text-right pr-2 text-[#484f58] font-mono text-[11px] leading-5 shrink-0 w-8">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 backdrop-blur-sm select-none">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 border-b border-[#30363d] px-4 flex items-center justify-between bg-[#0d1117] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Resolvedor 3-Way Merge</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#21262d] text-blue-300 border border-[#30363d]">
                  {conflict.path}
                </span>
              </div>
              <p className="text-[11px] text-[#8b949e]">
                Compara y selecciona cambios entre tu rama actual y la rama entrante.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPendingMarkers ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-amber-500/40 bg-amber-950/30 text-amber-300 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                {currentMarkersCount} conflicto{currentMarkersCount > 1 ? "s" : ""} pendiente{currentMarkersCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Conflictos resueltos
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#30363d] transition-colors ml-2"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="h-11 border-b border-[#30363d] px-4 flex items-center justify-between bg-[#161b22] text-xs shrink-0">
          <div className="flex items-center gap-2">
            {/* Block stepper if blocks detected */}
            {conflict.blocks.length > 0 && currentMarkersCount > 0 && (
              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 mr-2">
                <span className="text-[11px] text-[#8b949e]">
                  Bloque {Math.min(activeBlockIndex + 1, currentMarkersCount)} de {currentMarkersCount}:
                </span>
                <button
                  disabled={activeBlockIndex <= 0}
                  onClick={() => setActiveBlockIndex((prev) => Math.max(0, prev - 1))}
                  className="p-0.5 text-[#8b949e] hover:text-white disabled:opacity-30"
                  title="Bloque anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={activeBlockIndex >= currentMarkersCount - 1}
                  onClick={() =>
                    setActiveBlockIndex((prev) => Math.min(currentMarkersCount - 1, prev + 1))
                  }
                  className="p-0.5 text-[#8b949e] hover:text-white disabled:opacity-30"
                  title="Siguiente bloque"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Actions for active block */}
            {currentMarkersCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-950/30"
                  onClick={() => handleResolveBlock(activeBlockIndex, "ours")}
                  icon={<ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />}
                >
                  Tomar Nuestro
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30"
                  onClick={() => handleResolveBlock(activeBlockIndex, "both")}
                >
                  Aceptar Ambos
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-950/30"
                  onClick={() => handleResolveBlock(activeBlockIndex, "theirs")}
                  icon={<ArrowDownRight className="w-3.5 h-3.5 text-purple-400" />}
                >
                  Tomar Entrante
                </Button>

                <span className="text-[#30363d] mx-1">|</span>

                <button
                  onClick={() => handleResolveAll("ours")}
                  className="text-[11px] text-[#8b949e] hover:text-blue-300 underline underline-offset-2 ml-1"
                >
                  Resolver todos con Nuestro
                </button>

                <button
                  onClick={() => handleResolveAll("theirs")}
                  className="text-[11px] text-[#8b949e] hover:text-purple-300 underline underline-offset-2 ml-1"
                >
                  Resolver todos con Entrante
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-[#8b949e] hover:text-white"
              onClick={handleReset}
              icon={<RotateCcw className="w-3 h-3" />}
            >
              Reiniciar Original
            </Button>

            <Button
              size="sm"
              variant="primary"
              className="h-7 text-xs font-semibold"
              disabled={loading}
              onClick={handleSubmit}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            >
              {loading ? "Guardando..." : "Guardar y Marcar Resuelto"}
            </Button>
          </div>
        </div>

        {/* 3-Way Grid Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-x divide-[#30363d] overflow-hidden min-h-0 bg-[#0d1117]">
          {/* Column 1: OURS (HEAD) */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="h-9 px-3 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-medium text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>NUESTRO (HEAD / Local)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(conflict.ours_content, "ours")}
                  className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d]"
                  title="Copiar contenido nuestro"
                >
                  {copiedOurs ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleUseFullFile("ours")}
                  className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 hover:bg-blue-950/40"
                  title="Usar este archivo entero como resultado final"
                >
                  Usar Todo
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 bg-[#05080e] flex">
              {renderLineNumbers(conflict.ours_content)}
              <pre className="font-mono text-xs text-[#c9d1d9] leading-5 whitespace-pre overflow-x-auto flex-1 select-text">
                {conflict.ours_content || <span className="text-[#484f58] italic">(Archivo vacío o no existe)</span>}
              </pre>
            </div>
          </div>

          {/* Column 2: RESULT (Interactive & Editable Editor) */}
          <div className="flex flex-col h-full overflow-hidden bg-[#0d1117]">
            <div className="h-9 px-3 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>RESULTADO FINAL (Editable)</span>
              </div>
              <span className="text-[10px] text-[#8b949e]">
                {editedContent.split("\n").length} líneas
              </span>
            </div>

            <div className="flex-1 overflow-auto p-2 bg-[#010409] flex relative">
              {renderLineNumbers(editedContent)}
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                spellCheck={false}
                className="flex-1 h-full bg-transparent text-[#c9d1d9] font-mono text-xs leading-5 p-0 border-none outline-none resize-none whitespace-pre overflow-x-auto selection:bg-blue-600/40 select-text"
              />
            </div>
          </div>

          {/* Column 3: THEIRS (Incoming / Remote) */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="h-9 px-3 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-medium text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>ENTRANTE (Theirs / Remoto)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(conflict.theirs_content, "theirs")}
                  className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#30363d]"
                  title="Copiar contenido entrante"
                >
                  {copiedTheirs ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleUseFullFile("theirs")}
                  className="text-[10px] text-purple-400 hover:text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-950/40"
                  title="Usar este archivo entero como resultado final"
                >
                  Usar Todo
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 bg-[#05080e] flex">
              {renderLineNumbers(conflict.theirs_content)}
              <pre className="font-mono text-xs text-[#c9d1d9] leading-5 whitespace-pre overflow-x-auto flex-1 select-text">
                {conflict.theirs_content || <span className="text-[#484f58] italic">(Archivo vacío o no existe)</span>}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
